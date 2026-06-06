package service

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// panelSchedule defines when a panel type should be auto-refreshed.
type panelSchedule struct {
	panelType string
	// interval-based refresh (blockers, things-to-remember)
	interval time.Duration
	// weekly refresh at a specific day+time (suggestions, achievements)
	weekly    bool
	weeklyDay time.Weekday
	weeklyHr  int
}

// PanelScheduleStatus holds the current schedule info for a single panel.
type PanelScheduleStatus struct {
	NextRefresh time.Time `json:"nextRefresh"`
	LastError   string    `json:"lastError,omitempty"`
	Interval    string    `json:"interval"` // human-readable schedule description
}

// Scheduler auto-refreshes smart board panels on a schedule.
type Scheduler struct {
	svc       *SmartBoardService
	ctx       context.Context
	cancel    context.CancelFunc
	schedules []panelSchedule

	mu         sync.RWMutex
	nextTimes  map[string]time.Time // next scheduled refresh per panel
	lastErrors map[string]string    // last error message per panel (empty = ok)
}

// NewScheduler creates a scheduler with the default panel schedules.
func NewScheduler(svc *SmartBoardService) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	return &Scheduler{
		svc:        svc,
		ctx:        ctx,
		cancel:     cancel,
		nextTimes:  make(map[string]time.Time),
		lastErrors: make(map[string]string),
		schedules: []panelSchedule{
			{panelType: "blockers", interval: 5 * time.Hour},
			{panelType: "things-to-remember", interval: 6 * time.Hour},
			{panelType: "suggestions", weekly: true, weeklyDay: time.Saturday, weeklyHr: 8},
			{panelType: "achievements", weekly: true, weeklyDay: time.Saturday, weeklyHr: 8},
		},
	}
}

// Start launches background goroutines for each panel schedule.
func (s *Scheduler) Start() {
	fmt.Println("[scheduler] starting panel auto-refresh")
	for _, sched := range s.schedules {
		if sched.weekly {
			go s.runWeekly(sched)
		} else {
			go s.runInterval(sched)
		}
	}
}

// Stop cancels all scheduled goroutines.
func (s *Scheduler) Stop() {
	fmt.Println("[scheduler] stopping panel auto-refresh")
	s.cancel()
}

// Status returns the current schedule status for all panels.
func (s *Scheduler) Status() map[string]PanelScheduleStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]PanelScheduleStatus, len(s.schedules))
	for _, sched := range s.schedules {
		desc := sched.interval.String()
		if sched.weekly {
			desc = fmt.Sprintf("weekly %s %02d:00", sched.weeklyDay, sched.weeklyHr)
		}
		result[sched.panelType] = PanelScheduleStatus{
			NextRefresh: s.nextTimes[sched.panelType],
			LastError:   s.lastErrors[sched.panelType],
			Interval:    desc,
		}
	}
	return result
}

// runInterval refreshes a panel on a fixed interval using a ticker.
func (s *Scheduler) runInterval(sched panelSchedule) {
	ticker := time.NewTicker(sched.interval)
	defer ticker.Stop()

	// Set initial next-refresh time
	s.setNextTime(sched.panelType, time.Now().Add(sched.interval))
	fmt.Printf("[scheduler] %s: refreshing every %s\n", sched.panelType, sched.interval)

	for {
		select {
		case <-s.ctx.Done():
			fmt.Printf("[scheduler] %s: stopped\n", sched.panelType)
			return
		case <-ticker.C:
			s.refresh(sched.panelType)
			s.setNextTime(sched.panelType, time.Now().Add(sched.interval))
		}
	}
}

// runWeekly refreshes a panel once per week at a specific day and hour.
func (s *Scheduler) runWeekly(sched panelSchedule) {
	fmt.Printf("[scheduler] %s: refreshing weekly on %s at %02d:00\n",
		sched.panelType, sched.weeklyDay, sched.weeklyHr)

	for {
		wait := durationUntil(sched.weeklyDay, sched.weeklyHr, 0)
		nextTime := time.Now().Add(wait)
		s.setNextTime(sched.panelType, nextTime)
		fmt.Printf("[scheduler] %s: next refresh in %s\n",
			sched.panelType, wait.Round(time.Minute))

		timer := time.NewTimer(wait)
		select {
		case <-s.ctx.Done():
			timer.Stop()
			fmt.Printf("[scheduler] %s: stopped\n", sched.panelType)
			return
		case <-timer.C:
			s.refresh(sched.panelType)
		}
	}
}

// refresh triggers a forced panel refresh (bypasses cache TTL).
func (s *Scheduler) refresh(panelType string) {
	fmt.Printf("[scheduler] refreshing %s...\n", panelType)
	if _, err := s.svc.RefreshPanel(panelType, true); err != nil {
		fmt.Printf("[scheduler] ERROR refreshing %s: %v\n", panelType, err)
		s.setError(panelType, err.Error())
	} else {
		fmt.Printf("[scheduler] %s refreshed successfully\n", panelType)
		s.setError(panelType, "") // clear error on success
	}
}

// setNextTime updates the next scheduled refresh time for a panel.
func (s *Scheduler) setNextTime(panelType string, t time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nextTimes[panelType] = t
}

// setError updates the last error for a panel (empty string = success).
func (s *Scheduler) setError(panelType string, errMsg string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastErrors[panelType] = errMsg
}

// durationUntil calculates the time.Duration until the next occurrence
// of the given weekday at the specified hour:minute (local time).
func durationUntil(day time.Weekday, hour, minute int) time.Duration {
	now := time.Now()

	// Build target for this week
	target := time.Date(
		now.Year(), now.Month(), now.Day(),
		hour, minute, 0, 0,
		now.Location(),
	)

	// Advance to the target weekday
	daysAhead := int(day) - int(now.Weekday())
	if daysAhead < 0 {
		daysAhead += 7
	}
	target = target.AddDate(0, 0, daysAhead)

	// If we've already passed the target time today, push to next week
	if !target.After(now) {
		target = target.AddDate(0, 0, 7)
	}

	return target.Sub(now)
}

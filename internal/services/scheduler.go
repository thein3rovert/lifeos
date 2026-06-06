package service

import (
	"context"
	"fmt"
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

// Scheduler auto-refreshes smart board panels on a schedule.
type Scheduler struct {
	svc     *SmartBoardService
	ctx     context.Context
	cancel  context.CancelFunc
	schedules []panelSchedule
}

// NewScheduler creates a scheduler with the default panel schedules.
func NewScheduler(svc *SmartBoardService) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	return &Scheduler{
		svc:    svc,
		ctx:    ctx,
		cancel: cancel,
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

// runInterval refreshes a panel on a fixed interval using a ticker.
func (s *Scheduler) runInterval(sched panelSchedule) {
	ticker := time.NewTicker(sched.interval)
	defer ticker.Stop()

	fmt.Printf("[scheduler] %s: refreshing every %s\n", sched.panelType, sched.interval)

	for {
		select {
		case <-s.ctx.Done():
			fmt.Printf("[scheduler] %s: stopped\n", sched.panelType)
			return
		case <-ticker.C:
			s.refresh(sched.panelType)
		}
	}
}

// runWeekly refreshes a panel once per week at a specific day and hour.
func (s *Scheduler) runWeekly(sched panelSchedule) {
	fmt.Printf("[scheduler] %s: refreshing weekly on %s at %02d:00\n",
		sched.panelType, sched.weeklyDay, sched.weeklyHr)

	for {
		wait := durationUntil(sched.weeklyDay, sched.weeklyHr, 0)
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
	} else {
		fmt.Printf("[scheduler] %s refreshed successfully\n", panelType)
	}
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

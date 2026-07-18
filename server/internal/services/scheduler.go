package service

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
	"github.com/thein3rovert/lifeos/server/internal/store"
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
	NextRefresh     time.Time `json:"nextRefresh"`
	LastError       string    `json:"lastError,omitempty"`
	Interval        string    `json:"interval"` // human-readable schedule description
	Paused          bool      `json:"paused"`
	Mode            string    `json:"mode"` // "interval" or "weekly"
	IntervalMinutes int       `json:"intervalMinutes,omitempty"`
	WeeklyDay       int       `json:"weeklyDay,omitempty"`
	WeeklyHour      int       `json:"weeklyHour,omitempty"`
}

// Scheduler auto-refreshes smart board panels on a schedule.
type Scheduler struct {
	svc       *SmartBoardService
	store     store.SmartBoardStore // Hellps to get schedules details
	ctx       context.Context
	cancel    context.CancelFunc
	schedules []panelSchedule

	mu         sync.RWMutex
	nextTimes  map[string]time.Time // next scheduled refresh per panel
	lastErrors map[string]string    // last error message per panel (empty = ok)
	paused     map[string]bool      // pause state per panel
}

// NewScheduler creates a scheduler with the default panel schedules.
func NewScheduler(svc *SmartBoardService, store store.SmartBoardStore) *Scheduler {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Scheduler{
		svc:        svc,
		store:      store,
		ctx:        ctx,
		cancel:     cancel,
		nextTimes:  make(map[string]time.Time),
		lastErrors: make(map[string]string),
		paused:     make(map[string]bool),
	}

	// Load schedules from DB or seed defaults
	s.loadSchedules()

	return s
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
		mode := "interval"
		intervalMins := int(sched.interval.Minutes())
		weeklyDay := 0
		weeklyHour := 0

		if sched.weekly {
			desc = fmt.Sprintf("weekly %s %02d:00", sched.weeklyDay, sched.weeklyHr)
			mode = "weekly"
			weeklyDay = int(sched.weeklyDay)
			weeklyHour = sched.weeklyHr
			intervalMins = 0
		}

		result[sched.panelType] = PanelScheduleStatus{
			NextRefresh:     s.nextTimes[sched.panelType],
			LastError:       s.lastErrors[sched.panelType],
			Interval:        desc,
			Paused:          s.paused[sched.panelType],
			Mode:            mode,
			IntervalMinutes: intervalMins,
			WeeklyDay:       weeklyDay,
			WeeklyHour:      weeklyHour,
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
	log.Printf("[scheduler] %s: refreshing every %s", sched.panelType, sched.interval)

	for {
		select {
		case <-s.ctx.Done():
			log.Printf("[scheduler] %s: stopped", sched.panelType)
			return
		case <-ticker.C:
		// Refresh if panel is not paused
			if !s.IsPaused(sched.panelType) {
				s.refresh(sched.panelType)
			}
			s.setNextTime(sched.panelType, time.Now().Add(sched.interval))
		}
	}
}

// runWeekly refreshes a panel once per week at a specific day and hour.
func (s *Scheduler) runWeekly(sched panelSchedule) {
	log.Printf("[scheduler] %s: refreshing weekly on %s at %02d:00",
		sched.panelType, sched.weeklyDay, sched.weeklyHr)

	for {
		wait := durationUntil(sched.weeklyDay, sched.weeklyHr, 0)
		nextTime := time.Now().Add(wait)
		s.setNextTime(sched.panelType, nextTime)
		log.Printf("[scheduler] %s: next refresh in %s",
			sched.panelType, wait.Round(time.Minute))

		timer := time.NewTimer(wait)
		select {
		case <-s.ctx.Done():
			timer.Stop()
			log.Printf("[scheduler] %s: stopped", sched.panelType)
			return
		case <-timer.C:
			if !s.IsPaused(sched.panelType) {
				s.refresh(sched.panelType)
			}
		}
	}
}

// refresh triggers a forced panel refresh (bypasses cache TTL).
func (s *Scheduler) refresh(panelType string) {
	log.Printf("[scheduler] refreshing %s...", panelType)
	if _, err := s.svc.RefreshPanel(panelType, true); err != nil {
		log.Printf("[scheduler] ERROR refreshing %s: %v", panelType, err)
		s.setError(panelType, err.Error())
	} else {
		log.Printf("[scheduler] %s refreshed successfully", panelType)
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

// loadSchedules loads panel schedules from DB or seeds defaults
func (s *Scheduler) loadSchedules() {
	defaultSchedules := []struct {
		panelType       string
		mode            string
		intervalMinutes int
		weeklyDay       int
		weeklyHour      int
	}{
		{"blockers", "interval", 300, 0, 0},           // 5 hours
		{"things-to-remember", "interval", 360, 0, 0}, // 6 hours
		{"suggestions", "weekly", 0, 6, 8},            // Saturday 08:00 (6 = Saturday in 0-6 scale)
		{"achievements", "weekly", 0, 6, 8},           // Saturday 08:00
	}

	// Seed defaults if not exist
	for _, def := range defaultSchedules {
		existing, err := s.store.GetPanelSchedule(def.panelType)
		if err != nil {
			log.Printf("[scheduler] error loading schedule for %s: %v", def.panelType, err)
			continue
		}
		if existing == nil {
			// Seed default
			schedule := &model.PanelSchedule{
				PanelType:       def.panelType,
				Paused:          false,
				Mode:            def.mode,
				IntervalMinutes: def.intervalMinutes,
				WeeklyDay:       def.weeklyDay,
				WeeklyHour:      def.weeklyHour,
			}
			if err := s.store.SavePanelSchedule(schedule); err != nil {
				log.Printf("[scheduler] error seeding schedule for %s: %v", def.panelType, err)
			}
		}
	}

	// Load all schedules
	dbSchedules, err := s.store.GetAllPanelSchedules()
	if err != nil {
		log.Printf("[scheduler] error loading schedules: %v", err)
		return
	}

	// Convert to internal panelSchedule format
	for _, dbSched := range dbSchedules {
		sched := panelSchedule{
			panelType: dbSched.PanelType,
		}

		if dbSched.Mode == "interval" {
			sched.interval = time.Duration(dbSched.IntervalMinutes) * time.Minute
		} else if dbSched.Mode == "weekly" {
			sched.weekly = true
			sched.weeklyDay = time.Weekday(dbSched.WeeklyDay)
			sched.weeklyHr = dbSched.WeeklyHour
		}

		s.schedules = append(s.schedules, sched)
		s.paused[dbSched.PanelType] = dbSched.Paused
	}
}

// Pause pauses auto-refresh for a specific panel
func (s *Scheduler) Pause(panelType string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.paused[panelType] = true

	// Save to DB
	schedule, err := s.store.GetPanelSchedule(panelType)
	if err != nil {
		return err
	}
	if schedule == nil {
		return fmt.Errorf("schedule not found for panel: %s", panelType)
	}

	schedule.Paused = true
	return s.store.SavePanelSchedule(schedule)
}

// Resume resumes auto-refresh for a specific panel
func (s *Scheduler) Resume(panelType string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.paused[panelType] = false

	// Save to DB
	schedule, err := s.store.GetPanelSchedule(panelType)
	if err != nil {
		return err
	}
	if schedule == nil {
		return fmt.Errorf("schedule not found for panel: %s", panelType)
	}

	schedule.Paused = false
	return s.store.SavePanelSchedule(schedule)
}

// PauseAll pauses all panel auto-refreshes
func (s *Scheduler) PauseAll() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, sched := range s.schedules {
		s.paused[sched.panelType] = true
		schedule, err := s.store.GetPanelSchedule(sched.panelType)
		if err != nil || schedule == nil {
			continue
		}
		schedule.Paused = true
		if err := s.store.SavePanelSchedule(schedule); err != nil {
			log.Printf("[scheduler] error pausing %s: %v", sched.panelType, err)
		}
	}
	return nil
}

// ResumeAll resumes all panel auto-refreshes
func (s *Scheduler) ResumeAll() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, sched := range s.schedules {
		s.paused[sched.panelType] = false
		schedule, err := s.store.GetPanelSchedule(sched.panelType)
		if err != nil || schedule == nil {
			continue
		}
		schedule.Paused = false
		if err := s.store.SavePanelSchedule(schedule); err != nil {
			log.Printf("[scheduler] error resuming %s: %v", sched.panelType, err)
		}
	}
	return nil
}

// IsPaused checks if a panel is paused
func (s *Scheduler) IsPaused(panelType string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.paused[panelType]
}

// SetSchedule updates the schedule configuration for a panel
func (s *Scheduler) SetSchedule(panelType string, mode string, intervalMinutes, weeklyDay, weeklyHour int) error {
	// Get existing schedule from DB
	schedule, err := s.store.GetPanelSchedule(panelType)
	if err != nil {
		return err
	}
	if schedule == nil {
		return fmt.Errorf("schedule not found for panel: %s", panelType)
	}

	// Update fields
	schedule.Mode = mode
	schedule.IntervalMinutes = intervalMinutes
	schedule.WeeklyDay = weeklyDay
	schedule.WeeklyHour = weeklyHour

	// Save to DB
	if err := s.store.SavePanelSchedule(schedule); err != nil {
		return err
	}

	// Reload schedules to apply changes
	s.mu.Lock()
	s.schedules = nil // Clear existing
	s.mu.Unlock()
	s.loadSchedules()

	// Note: Current goroutines will continue with old schedule until their next tick.
	// For immediate effect, we would need to cancel and restart goroutines.
	// For now, changes will take effect on next scheduled refresh.

	return nil
}

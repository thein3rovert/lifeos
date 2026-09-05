package service

import (
	"errors"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

type habitStoreStub struct {
	habit       *model.Habit
	completions []model.HabitCompletion
	completed   bool
	days        []model.HabitDay
	createdDay  bool
	err         error
}

func (s *habitStoreStub) ListHabits() ([]model.Habit, error) { return nil, nil }
func (s *habitStoreStub) GetHabit(string) (*model.Habit, error) {
	if s.habit == nil {
		return nil, store.ErrHabitNotFound
	}
	copy := *s.habit
	return &copy, nil
}
func (s *habitStoreStub) CreateHabit(habit *model.Habit) error {
	s.habit = habit
	return nil
}
func (s *habitStoreStub) UpdateHabit(habit *model.Habit) error {
	s.habit = habit
	return nil
}
func (s *habitStoreStub) ArchiveHabit(string, time.Time) error { return nil }
func (s *habitStoreStub) ListHabitDays(string, string) ([]model.HabitDay, error) {
	return s.days, s.err
}
func (s *habitStoreStub) CreateHabitDay(day *model.HabitDay) (bool, error) {
	s.days = []model.HabitDay{*day}
	return s.createdDay, s.err
}
func (s *habitStoreStub) ListHabitCompletions(string, string) ([]model.HabitCompletion, error) {
	return s.completions, s.err
}
func (s *habitStoreStub) ListCompletionsForHabit(string, string, string) ([]model.HabitCompletion, error) {
	return s.completions, s.err
}
func (s *habitStoreStub) ToggleHabitCompletion(string, string, string, time.Time) (bool, error) {
	return s.completed, s.err
}

func TestHabitServiceCreateValidation(t *testing.T) {
	tests := []struct {
		name  string
		input CreateHabitInput
		want  string
	}{
		{name: "blank name", input: CreateHabitInput{Name: "  "}, want: "name must not be empty"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewHabitService(&habitStoreStub{}).CreateHabit(tt.input)
			var validationErr *ValidationError
			if !errors.As(err, &validationErr) || err.Error() != tt.want {
				t.Fatalf("CreateHabit() error = %v, want validation error %q", err, tt.want)
			}
		})
	}
}

func TestHabitServiceCreateAndUpdate(t *testing.T) {
	stub := &habitStoreStub{}
	svc := NewHabitService(stub)
	svc.now = func() time.Time { return time.Date(2026, 9, 5, 12, 0, 0, 0, time.UTC) }
	habit, err := svc.CreateHabit(CreateHabitInput{Name: "  Read  "})
	if err != nil {
		t.Fatalf("CreateHabit() error = %v", err)
	}
	if habit.ID == "" || habit.Name != "Read" {
		t.Fatalf("CreateHabit() = %#v", habit)
	}

	name := "Read daily"
	input := UpdateHabitInput{Name: &name}
	updated, err := svc.UpdateHabit(habit.ID, input)
	if err != nil {
		t.Fatalf("UpdateHabit() error = %v", err)
	}
	if updated.Name != name {
		t.Fatalf("UpdateHabit() = %#v", updated)
	}
}

func TestHabitServiceDaysRejectFutureAndCreateToday(t *testing.T) {
	stub := &habitStoreStub{
		createdDay: true,
		days:       []model.HabitDay{{ID: "day-1", Date: "2026-09-05"}},
	}
	svc := NewHabitService(stub)
	svc.now = func() time.Time { return time.Date(2026, 9, 5, 12, 0, 0, 0, time.UTC) }
	days, err := svc.ListHabitDays("2026-09-01", "2026-09-30")
	if err != nil || len(days) != 1 {
		t.Fatalf("ListHabitDays() = %#v, %v", days, err)
	}
	if _, _, err := svc.CreateHabitDay(CreateHabitDayInput{Date: "2026-09-06"}); err == nil {
		t.Fatal("CreateHabitDay() accepted future date")
	}
	day, created, err := svc.CreateHabitDay(CreateHabitDayInput{})
	if err != nil || !created || day.Date != "2026-09-05" {
		t.Fatalf("CreateHabitDay() = %#v, %v, %v", day, created, err)
	}
}

func TestHabitServiceCompletionValidation(t *testing.T) {
	svc := NewHabitService(&habitStoreStub{})
	tests := []struct {
		name  string
		start string
		end   string
		want  string
	}{
		{name: "missing start", end: "2026-09-05", want: "start must be a valid YYYY-MM-DD date"},
		{name: "noncanonical start", start: "2026-9-01", end: "2026-09-05", want: "start must be a valid YYYY-MM-DD date"},
		{name: "impossible end", start: "2026-09-01", end: "2026-09-31", want: "end must be a valid YYYY-MM-DD date"},
		{name: "reversed", start: "2026-09-06", end: "2026-09-05", want: "end must not be before start"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.ListHabitCompletions(tt.start, tt.end)
			var validationErr *ValidationError
			if !errors.As(err, &validationErr) || err.Error() != tt.want {
				t.Fatalf("ListHabitCompletions() error = %v, want %q", err, tt.want)
			}
		})
	}

	if _, err := svc.ToggleHabitCompletion(ToggleHabitCompletionInput{HabitID: "habit-1", Date: "2025-02-29"}); err == nil {
		t.Fatal("ToggleHabitCompletion() accepted an impossible date")
	}
	if _, err := svc.ToggleHabitCompletion(ToggleHabitCompletionInput{Date: "2026-09-05"}); err == nil {
		t.Fatal("ToggleHabitCompletion() accepted a missing habitId")
	}
}

func TestHabitServiceCompletions(t *testing.T) {
	stub := &habitStoreStub{
		completions: []model.HabitCompletion{{HabitID: "habit-1", Date: "2026-09-05"}},
		completed:   true,
	}
	svc := NewHabitService(stub)
	completions, err := svc.ListCompletionsForHabit("habit-1", "2026-09-05", "2026-09-05")
	if err != nil || len(completions) != 1 {
		t.Fatalf("ListCompletionsForHabit() = %#v, %v", completions, err)
	}
	completed, err := svc.ToggleHabitCompletion(ToggleHabitCompletionInput{HabitID: "habit-1", Date: "2026-09-05"})
	if err != nil || !completed {
		t.Fatalf("ToggleHabitCompletion() = %v, %v", completed, err)
	}
}

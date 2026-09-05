package service

import (
	"errors"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

type habitStoreStub struct {
	habit *model.Habit
}

func (s *habitStoreStub) ListHabits() ([]model.Habit, error) { return nil, nil }
func (s *habitStoreStub) GetHabit(string) (*model.Habit, error) {
	if s.habit == nil {
		return nil, store.ErrHabitNotFound
	}
	copy := *s.habit
	copy.Weekdays = append([]string(nil), s.habit.Weekdays...)
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

func TestHabitServiceCreateValidation(t *testing.T) {
	tests := []struct {
		name  string
		input CreateHabitInput
		want  string
	}{
		{name: "blank name", input: CreateHabitInput{Name: "  ", Recurrence: "daily", StartDate: "2026-09-05"}, want: "name must not be empty"},
		{name: "noncanonical date", input: CreateHabitInput{Name: "Read", Recurrence: "daily", StartDate: "2026-9-5"}, want: "startDate must be a valid YYYY-MM-DD date"},
		{name: "end before start", input: CreateHabitInput{Name: "Read", Recurrence: "daily", StartDate: "2026-09-05", EndDate: stringPtr("2026-09-04")}, want: "endDate must not be before startDate"},
		{name: "daily weekdays", input: CreateHabitInput{Name: "Read", Recurrence: "daily", Weekdays: []string{"MO"}, StartDate: "2026-09-05"}, want: "daily habits must not include weekdays"},
		{name: "weekly empty", input: CreateHabitInput{Name: "Read", Recurrence: "weekly", StartDate: "2026-09-05"}, want: "weekly habits must include at least one weekday"},
		{name: "weekly duplicate", input: CreateHabitInput{Name: "Read", Recurrence: "weekly", Weekdays: []string{"MO", "MO"}, StartDate: "2026-09-05"}, want: `weekday "MO" must be unique`},
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
	habit, err := svc.CreateHabit(CreateHabitInput{
		Name: "  Read  ", Recurrence: "weekly", Weekdays: []string{"MO", "FR"}, StartDate: "2026-09-05",
	})
	if err != nil {
		t.Fatalf("CreateHabit() error = %v", err)
	}
	if habit.ID == "" || habit.Name != "Read" {
		t.Fatalf("CreateHabit() = %#v", habit)
	}

	daily := "daily"
	emptyWeekdays := []string{}
	input := UpdateHabitInput{Recurrence: &daily, Weekdays: &emptyWeekdays, EndDate: OptionalString{Set: true}}
	updated, err := svc.UpdateHabit(habit.ID, input)
	if err != nil {
		t.Fatalf("UpdateHabit() error = %v", err)
	}
	if updated.Recurrence != "daily" || len(updated.Weekdays) != 0 || updated.EndDate != nil {
		t.Fatalf("UpdateHabit() = %#v", updated)
	}
}

func stringPtr(value string) *string { return &value }

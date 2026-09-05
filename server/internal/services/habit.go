package service

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

type CreateHabitInput struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Color       string   `json:"color"`
	Icon        string   `json:"icon"`
	Recurrence  string   `json:"recurrence"`
	Weekdays    []string `json:"weekdays"`
	StartDate   string   `json:"startDate"`
	EndDate     *string  `json:"endDate"`
}

type UpdateHabitInput struct {
	Name        *string        `json:"name"`
	Description *string        `json:"description"`
	Color       *string        `json:"color"`
	Icon        *string        `json:"icon"`
	Recurrence  *string        `json:"recurrence"`
	Weekdays    *[]string      `json:"weekdays"`
	StartDate   *string        `json:"startDate"`
	EndDate     OptionalString `json:"endDate"`
}

// OptionalString distinguishes an omitted PATCH field from an explicit null.
type OptionalString struct {
	Set   bool
	Value *string
}

func (value *OptionalString) UnmarshalJSON(data []byte) error {
	value.Set = true
	if string(data) == "null" {
		value.Value = nil
		return nil
	}
	return json.Unmarshal(data, &value.Value)
}

type HabitService struct {
	store store.HabitStore
	now   func() time.Time
}

func NewHabitService(store store.HabitStore) *HabitService {
	return &HabitService{store: store, now: time.Now}
}

func (s *HabitService) ListHabits() ([]model.Habit, error) {
	return s.store.ListHabits()
}

func (s *HabitService) CreateHabit(input CreateHabitInput) (*model.Habit, error) {
	habit := &model.Habit{
		Name: input.Name, Description: input.Description, Color: input.Color, Icon: input.Icon,
		Recurrence: input.Recurrence, Weekdays: input.Weekdays, StartDate: input.StartDate, EndDate: input.EndDate,
	}
	if err := validateHabit(habit); err != nil {
		return nil, err
	}
	id, err := newHabitID()
	if err != nil {
		return nil, fmt.Errorf("generate habit ID: %w", err)
	}
	now := s.now().UTC()
	habit.ID = id
	habit.CreatedAt = now
	habit.UpdatedAt = now
	if err := s.store.CreateHabit(habit); err != nil {
		return nil, err
	}
	return habit, nil
}

func (s *HabitService) UpdateHabit(id string, input UpdateHabitInput) (*model.Habit, error) {
	if !input.hasUpdates() {
		return nil, &ValidationError{Message: "at least one field is required"}
	}
	habit, err := s.store.GetHabit(id)
	if err != nil {
		return nil, err
	}
	applyHabitUpdate(habit, input)
	if err := validateHabit(habit); err != nil {
		return nil, err
	}
	habit.UpdatedAt = s.now().UTC()
	if err := s.store.UpdateHabit(habit); err != nil {
		return nil, err
	}
	return habit, nil
}

func (s *HabitService) DeleteHabit(id string) error {
	return s.store.ArchiveHabit(id, s.now().UTC())
}

func (input UpdateHabitInput) hasUpdates() bool {
	return input.Name != nil || input.Description != nil || input.Color != nil || input.Icon != nil ||
		input.Recurrence != nil || input.Weekdays != nil || input.StartDate != nil || input.EndDate.Set
}

func applyHabitUpdate(habit *model.Habit, input UpdateHabitInput) {
	if input.Name != nil {
		habit.Name = *input.Name
	}
	if input.Description != nil {
		habit.Description = *input.Description
	}
	if input.Color != nil {
		habit.Color = *input.Color
	}
	if input.Icon != nil {
		habit.Icon = *input.Icon
	}
	if input.Recurrence != nil {
		habit.Recurrence = *input.Recurrence
	}
	if input.Weekdays != nil {
		habit.Weekdays = *input.Weekdays
	}
	if input.StartDate != nil {
		habit.StartDate = *input.StartDate
	}
	if input.EndDate.Set {
		habit.EndDate = input.EndDate.Value
	}
}

// Validate habit inputs
func validateHabit(habit *model.Habit) error {
	habit.Name = strings.TrimSpace(habit.Name)
	if habit.Name == "" {
		return &ValidationError{Message: "name must not be empty"}
	}
	start, err := canonicalDate(habit.StartDate)
	if err != nil {
		return &ValidationError{Message: "startDate must be a valid YYYY-MM-DD date"}
	}
	if habit.EndDate != nil {
		end, err := canonicalDate(*habit.EndDate)
		if err != nil {
			return &ValidationError{Message: "endDate must be a valid YYYY-MM-DD date"}
		}
		if end.Before(start) {
			return &ValidationError{Message: "endDate must not be before startDate"}
		}
	}

	switch habit.Recurrence {
	case "daily":
		if len(habit.Weekdays) != 0 {
			return &ValidationError{Message: "daily habits must not include weekdays"}
		}
		habit.Weekdays = []string{}
	case "weekly":
		if len(habit.Weekdays) == 0 {
			return &ValidationError{Message: "weekly habits must include at least one weekday"}
		}
		valid := map[string]bool{"SU": true, "MO": true, "TU": true, "WE": true, "TH": true, "FR": true, "SA": true}
		seen := make(map[string]bool, len(habit.Weekdays))
		for _, weekday := range habit.Weekdays {
			if !valid[weekday] {
				return &ValidationError{Message: fmt.Sprintf("invalid weekday %q; use SU, MO, TU, WE, TH, FR, or SA", weekday)}
			}
			if seen[weekday] {
				return &ValidationError{Message: fmt.Sprintf("weekday %q must be unique", weekday)}
			}
			seen[weekday] = true
		}
	default:
		return &ValidationError{Message: "recurrence must be daily or weekly"}
	}
	return nil
}

func canonicalDate(value string) (time.Time, error) {
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil || parsed.Format("2006-01-02") != value {
		return time.Time{}, errors.New("invalid date")
	}
	return parsed, nil
}

func newHabitID() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

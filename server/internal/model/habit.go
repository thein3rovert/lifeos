package model

import "time"

// Habit defines an active or archived recurring habit.
type Habit struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Color       string     `json:"color"`
	Icon        string     `json:"icon"`
	Recurrence  string     `json:"recurrence"`
	Weekdays    []string   `json:"weekdays"`
	StartDate   string     `json:"startDate"`
	EndDate     *string    `json:"endDate"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	ArchivedAt  *time.Time `json:"archivedAt,omitempty"`
}

// HabitCompletion identifies a habit completed on a local calendar date.
type HabitCompletion struct {
	HabitID string `json:"habitId"`
	Date    string `json:"date"`
}

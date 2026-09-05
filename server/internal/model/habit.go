package model

import "time"

// Habit defines an active or archived reusable habit.
type Habit struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Color       string     `json:"color"`
	Icon        string     `json:"icon"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
	ArchivedAt  *time.Time `json:"archivedAt,omitempty"`
}

// HabitDay identifies an explicitly persisted day for tracking habits.
type HabitDay struct {
	ID        string    `json:"id"`
	Date      string    `json:"date"`
	CreatedAt time.Time `json:"createdAt"`
}

// HabitCompletion identifies a habit completed on a local calendar date.
type HabitCompletion struct {
	HabitID string `json:"habitId"`
	Date    string `json:"date"`
}

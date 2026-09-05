package store

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
)

func TestHabitStoreCRUDAndArchive(t *testing.T) {
	sqliteStore, err := NewSQLiteStore(filepath.Join(t.TempDir(), "habits.db"))
	if err != nil {
		t.Fatalf("NewSQLiteStore() error = %v", err)
	}
	defer sqliteStore.DB().Close()

	store := NewHabitStore(sqliteStore.DB())
	endDate := "2026-09-30"
	now := time.Date(2026, 9, 5, 12, 0, 0, 0, time.UTC)
	habit := &model.Habit{
		ID: "habit-1", Name: "Read", Description: "A chapter", Color: "blue", Icon: "book",
		Recurrence: "weekly", Weekdays: []string{"MO", "FR"}, StartDate: "2026-09-05",
		EndDate: &endDate, CreatedAt: now, UpdatedAt: now,
	}
	if err := store.CreateHabit(habit); err != nil {
		t.Fatalf("CreateHabit() error = %v", err)
	}

	habits, err := store.ListHabits()
	if err != nil {
		t.Fatalf("ListHabits() error = %v", err)
	}
	if len(habits) != 1 || len(habits[0].Weekdays) != 2 || habits[0].Weekdays[1] != "FR" {
		t.Fatalf("ListHabits() = %#v", habits)
	}

	habit.Name = "Read daily"
	habit.Recurrence = "daily"
	habit.Weekdays = []string{}
	habit.EndDate = nil
	if err := store.UpdateHabit(habit); err != nil {
		t.Fatalf("UpdateHabit() error = %v", err)
	}
	got, err := store.GetHabit(habit.ID)
	if err != nil {
		t.Fatalf("GetHabit() error = %v", err)
	}
	if got.Name != "Read daily" || got.EndDate != nil || len(got.Weekdays) != 0 {
		t.Fatalf("GetHabit() = %#v", got)
	}

	if err := store.ArchiveHabit(habit.ID, now.Add(time.Hour)); err != nil {
		t.Fatalf("ArchiveHabit() error = %v", err)
	}
	habits, err = store.ListHabits()
	if err != nil {
		t.Fatalf("ListHabits() after archive error = %v", err)
	}
	if len(habits) != 0 {
		t.Fatalf("ListHabits() after archive = %#v, want empty", habits)
	}
	if _, err := store.GetHabit(habit.ID); err != ErrHabitNotFound {
		t.Fatalf("GetHabit() after archive error = %v, want ErrHabitNotFound", err)
	}
}

func TestHabitStoreMissingUpdateAndArchive(t *testing.T) {
	sqliteStore, err := NewSQLiteStore(filepath.Join(t.TempDir(), "habits.db"))
	if err != nil {
		t.Fatalf("NewSQLiteStore() error = %v", err)
	}
	defer sqliteStore.DB().Close()
	store := NewHabitStore(sqliteStore.DB())

	if err := store.UpdateHabit(&model.Habit{ID: "missing"}); err != ErrHabitNotFound {
		t.Fatalf("UpdateHabit() error = %v, want ErrHabitNotFound", err)
	}
	if err := store.ArchiveHabit("missing", time.Now()); err != ErrHabitNotFound {
		t.Fatalf("ArchiveHabit() error = %v, want ErrHabitNotFound", err)
	}
}

func TestHabitStoreCompletions(t *testing.T) {
	sqliteStore, err := NewSQLiteStore(filepath.Join(t.TempDir(), "habits.db"))
	if err != nil {
		t.Fatalf("NewSQLiteStore() error = %v", err)
	}
	defer sqliteStore.DB().Close()
	store := NewHabitStore(sqliteStore.DB())
	now := time.Date(2026, 9, 5, 12, 0, 0, 0, time.UTC)
	for _, habit := range []*model.Habit{
		{ID: "habit-1", Name: "Read", Recurrence: "daily", StartDate: "2026-09-01", CreatedAt: now, UpdatedAt: now},
		{ID: "habit-2", Name: "Walk", Recurrence: "daily", StartDate: "2026-09-01", CreatedAt: now, UpdatedAt: now},
	} {
		if err := store.CreateHabit(habit); err != nil {
			t.Fatalf("CreateHabit(%q) error = %v", habit.ID, err)
		}
	}

	completed, err := store.ToggleHabitCompletion("habit-1", "2026-09-01", "completion-1", now)
	if err != nil || !completed {
		t.Fatalf("first ToggleHabitCompletion() = %v, %v; want true, nil", completed, err)
	}
	completed, err = store.ToggleHabitCompletion("habit-1", "2026-09-03", "completion-2", now)
	if err != nil || !completed {
		t.Fatalf("second ToggleHabitCompletion() = %v, %v; want true, nil", completed, err)
	}
	completed, err = store.ToggleHabitCompletion("habit-2", "2026-09-03", "completion-3", now)
	if err != nil || !completed {
		t.Fatalf("third ToggleHabitCompletion() = %v, %v; want true, nil", completed, err)
	}

	completions, err := store.ListHabitCompletions("2026-09-01", "2026-09-03")
	if err != nil {
		t.Fatalf("ListHabitCompletions() error = %v", err)
	}
	if len(completions) != 3 || completions[0].Date != "2026-09-01" || completions[2].Date != "2026-09-03" {
		t.Fatalf("ListHabitCompletions() = %#v; want inclusive range", completions)
	}
	history, err := store.ListCompletionsForHabit("habit-1", "2026-09-03", "2026-09-03")
	if err != nil || len(history) != 1 || history[0].HabitID != "habit-1" {
		t.Fatalf("ListCompletionsForHabit() = %#v, %v", history, err)
	}

	completed, err = store.ToggleHabitCompletion("habit-1", "2026-09-03", "unused", now)
	if err != nil || completed {
		t.Fatalf("toggle off = %v, %v; want false, nil", completed, err)
	}
	history, err = store.ListCompletionsForHabit("habit-1", "2026-09-01", "2026-09-03")
	if err != nil || len(history) != 1 || history[0].Date != "2026-09-01" {
		t.Fatalf("history after toggle off = %#v, %v", history, err)
	}

	if _, err := store.ToggleHabitCompletion("missing", "2026-09-01", "completion-4", now); err != ErrHabitNotFound {
		t.Fatalf("missing ToggleHabitCompletion() error = %v, want ErrHabitNotFound", err)
	}
	if _, err := store.ListCompletionsForHabit("missing", "2026-09-01", "2026-09-03"); err != ErrHabitNotFound {
		t.Fatalf("missing ListCompletionsForHabit() error = %v, want ErrHabitNotFound", err)
	}
}

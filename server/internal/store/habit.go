package store

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
)

var ErrHabitNotFound = errors.New("habit not found")

// HabitStore defines persistence for active habits.
type HabitStore interface {
	ListHabits() ([]model.Habit, error)
	GetHabit(id string) (*model.Habit, error)
	CreateHabit(habit *model.Habit) error
	UpdateHabit(habit *model.Habit) error
	ArchiveHabit(id string, archivedAt time.Time) error
}

type SQLHabitStore struct {
	db *sql.DB
}

func NewHabitStore(db *sql.DB) *SQLHabitStore {
	return &SQLHabitStore{db: db}
}

const habitColumns = `id, name, description, color, icon, recurrence, weekdays,
	start_date, end_date, created_at, updated_at, archived_at`

func (s *SQLHabitStore) ListHabits() ([]model.Habit, error) {
	rows, err := s.db.Query(`SELECT ` + habitColumns + ` FROM habits
		WHERE archived_at IS NULL ORDER BY created_at, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	habits := make([]model.Habit, 0)
	for rows.Next() {
		habit, err := scanHabit(rows)
		if err != nil {
			return nil, err
		}
		habits = append(habits, *habit)
	}
	return habits, rows.Err()
}

func (s *SQLHabitStore) GetHabit(id string) (*model.Habit, error) {
	habit, err := scanHabit(s.db.QueryRow(`SELECT `+habitColumns+` FROM habits
		WHERE id = ? AND archived_at IS NULL`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrHabitNotFound
	}
	return habit, err
}

func (s *SQLHabitStore) CreateHabit(habit *model.Habit) error {
	_, err := s.db.Exec(`INSERT INTO habits
		(id, name, description, color, icon, recurrence, weekdays, start_date, end_date, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		habit.ID, habit.Name, habit.Description, habit.Color, habit.Icon,
		habit.Recurrence, strings.Join(habit.Weekdays, ","), habit.StartDate,
		habit.EndDate, habit.CreatedAt, habit.UpdatedAt)
	return err
}

func (s *SQLHabitStore) UpdateHabit(habit *model.Habit) error {
	result, err := s.db.Exec(`UPDATE habits SET name = ?, description = ?, color = ?, icon = ?,
		recurrence = ?, weekdays = ?, start_date = ?, end_date = ?, updated_at = ?
		WHERE id = ? AND archived_at IS NULL`,
		habit.Name, habit.Description, habit.Color, habit.Icon, habit.Recurrence,
		strings.Join(habit.Weekdays, ","), habit.StartDate, habit.EndDate, habit.UpdatedAt, habit.ID)
	if err != nil {
		return err
	}
	return habitResultError(result)
}

func (s *SQLHabitStore) ArchiveHabit(id string, archivedAt time.Time) error {
	result, err := s.db.Exec(`UPDATE habits SET archived_at = ?, updated_at = ?
		WHERE id = ? AND archived_at IS NULL`, archivedAt, archivedAt, id)
	if err != nil {
		return err
	}
	return habitResultError(result)
}

func habitResultError(result sql.Result) error {
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return ErrHabitNotFound
	}
	return nil
}

type habitScanner interface {
	Scan(dest ...any) error
}

func scanHabit(scanner habitScanner) (*model.Habit, error) {
	var habit model.Habit
	var weekdays string
	var endDate sql.NullString
	var archivedAt sql.NullTime
	if err := scanner.Scan(
		&habit.ID, &habit.Name, &habit.Description, &habit.Color, &habit.Icon,
		&habit.Recurrence, &weekdays, &habit.StartDate, &endDate,
		&habit.CreatedAt, &habit.UpdatedAt, &archivedAt,
	); err != nil {
		return nil, err
	}
	if weekdays != "" {
		habit.Weekdays = strings.Split(weekdays, ",")
	} else {
		habit.Weekdays = []string{}
	}
	if endDate.Valid {
		habit.EndDate = &endDate.String
	}
	if archivedAt.Valid {
		habit.ArchivedAt = &archivedAt.Time
	}
	return &habit, nil
}

package store

import (
	"path/filepath"
	"testing"
)

func TestMigrateCreatesHabitSchema(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "lifeos-test.db")
	s, err := NewSQLiteStore(dbPath)
	if err != nil {
		t.Fatalf("NewSQLiteStore() error = %v", err)
	}
	defer s.DB().Close()

	for _, table := range []string{"habits", "habit_days", "habit_completions"} {
		var name string
		if err := s.DB().QueryRow(
			`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, table,
		).Scan(&name); err != nil {
			t.Fatalf("expected table %q: %v", table, err)
		}
	}

	columns, err := s.DB().Query(`PRAGMA table_info(habits)`)
	if err != nil {
		t.Fatalf("read habit columns: %v", err)
	}
	defer columns.Close()
	found := map[string]bool{}
	for columns.Next() {
		var cid, notNull, primaryKey int
		var name, columnType string
		var defaultValue any
		if err := columns.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &primaryKey); err != nil {
			t.Fatalf("scan habit column: %v", err)
		}
		found[name] = true
	}
	for _, name := range []string{"recurrence", "weekdays", "start_date", "end_date"} {
		if !found[name] {
			t.Errorf("expected habit schedule column %q", name)
		}
	}

	if _, err := s.DB().Exec(`
		INSERT INTO habits (id, name) VALUES ('habit-1', 'Read');
		INSERT INTO habit_completions (id, habit_id, date) VALUES ('completion-1', 'habit-1', '2026-09-05');
	`); err != nil {
		t.Fatalf("insert habit schema rows: %v", err)
	}
	if _, err := s.DB().Exec(
		`INSERT INTO habit_completions (id, habit_id, date) VALUES ('completion-2', 'habit-1', '2026-09-05')`,
	); err == nil {
		t.Fatal("expected unique habit/date completion constraint")
	}
}

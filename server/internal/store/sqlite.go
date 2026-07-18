package store

import (
	"database/sql"
	"strings"

	_ "modernc.org/sqlite"
)

// SQLiteStore holds our database connection.
// All methods that touch the DB live on this struct.
type SQLiteStore struct {
	db *sql.DB
}

// NewSQLiteStore opens the SQLite file at the given path,
// checks the connection is alive, then runs migrations.
// Call this once at startup in main.go.
func NewSQLiteStore(dsn string) (*SQLiteStore, error) {
	// Open doesn't actually connect — it just sets up the driver
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	// Ping forces an actual connection so we catch bad paths early
	if err := db.Ping(); err != nil {
		return nil, err
	}

	s := &SQLiteStore{db: db}

	// Run migrations before we hand the store back to main.go
	if err := s.migrate(); err != nil {
		return nil, err
	}

	return s, nil
}

// DB returns the underlying database connection
func (s *SQLiteStore) DB() *sql.DB {
	return s.db
}

// migrate creates any tables that don't exist yet and runs idempotent
// column-add migrations for older databases.
//
// All schema changes for the app should live HERE — putting CREATE TABLE
// statements in feature packages (as we used to) risks two definitions of
// the same table with different shapes racing on startup.
//
// Safe to run every startup — IF NOT EXISTS covers CREATE, and
// "duplicate column name" errors from ALTER TABLE are ignored below.
func (s *SQLiteStore) migrate() error {
	queries := []string{
		// ── skills ────────────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS skills (
			id TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			format TEXT,
			author TEXT,
			content TEXT NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			synced_at DATETIME,
			pending_sync BOOLEAN DEFAULT FALSE,
			github_sha TEXT,
			opencode_session_id TEXT
		);`,
		`CREATE INDEX IF NOT EXISTS idx_skills_pending ON skills(pending_sync);`,
		`CREATE INDEX IF NOT EXISTS idx_skills_synced ON skills(synced_at);`,
		// Migration: opencode_session_id was added later — safe on new DBs too
		`ALTER TABLE skills ADD COLUMN opencode_session_id TEXT;`,

		// ── chat_messages ────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS chat_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			skill_id TEXT NOT NULL,
			session_id TEXT NOT NULL,
			role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_chat_messages_skill_session ON chat_messages(skill_id, session_id);`,
		`CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);`,

		// ── skill_notes ──────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS skill_notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			skill_id TEXT NOT NULL,
			title TEXT NOT NULL DEFAULT '',
			content TEXT NOT NULL,
			type TEXT NOT NULL DEFAULT 'manual' CHECK(type IN ('manual', 'ai-generated')),
			created_at DATETIME NOT NULL,
			updated_at DATETIME,
			FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_skill_notes_skill_id ON skill_notes(skill_id);`,

		// ── skill_files ──────────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS skill_files (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			skill_id TEXT NOT NULL,
			path TEXT NOT NULL,
			type TEXT NOT NULL CHECK(type IN ('file', 'dir')),
			name TEXT NOT NULL,
			content TEXT,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			pending_sync BOOLEAN DEFAULT FALSE,
			github_sha TEXT,
			UNIQUE(skill_id, path),
			FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
		);`,
		`CREATE INDEX IF NOT EXISTS idx_skill_files_skill_id ON skill_files(skill_id);`,
		`CREATE INDEX IF NOT EXISTS idx_skill_files_pending ON skill_files(pending_sync);`,
		// Migrations: columns added after initial release — idempotent
		`ALTER TABLE skill_files ADD COLUMN pending_sync BOOLEAN DEFAULT FALSE;`,
		`ALTER TABLE skill_files ADD COLUMN github_sha TEXT;`,

		// ── smartboard_panels ────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS smartboard_panels (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			panel_type TEXT NOT NULL CHECK(panel_type IN (
				'things-to-remember',
				'suggestions',
				'achievements',
				'blockers'
			)),
			data TEXT NOT NULL,
			session_id TEXT,
			last_refreshed DATETIME NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`,
		`ALTER TABLE smartboard_panels ADD COLUMN session_id TEXT;`,
		`ALTER TABLE smartboard_panels ADD COLUMN source_fingerprint TEXT NOT NULL DEFAULT '';`,
		`CREATE INDEX IF NOT EXISTS idx_smartboard_panels_type_refresh ON smartboard_panels(panel_type, last_refreshed DESC);`,

		// ── panel_schedules ──────────────────────────────────────
		`CREATE TABLE IF NOT EXISTS panel_schedules (
			panel_type TEXT PRIMARY KEY,
			paused BOOLEAN DEFAULT FALSE,
			mode TEXT DEFAULT 'interval' CHECK(mode IN ('interval', 'weekly')),
			interval_minutes INTEGER,
			weekly_day INTEGER CHECK(weekly_day >= 0 AND weekly_day <= 6),
			weekly_hour INTEGER CHECK(weekly_hour >= 0 AND weekly_hour <= 23),
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
	}

	for _, q := range queries {
		if _, err := s.db.Exec(q); err != nil {
			// Ignore "duplicate column" errors from ALTER TABLE (idempotent)
			if !strings.Contains(err.Error(), "duplicate column name") {
				return err
			}
		}
	}
	return nil
}

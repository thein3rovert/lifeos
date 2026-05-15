package store

import (
	"database/sql"

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

// migrate creates any tables that don't exist yet.
// Safe to run every startup — IF NOT EXISTS means it won't clobber existing data.
func (s *SQLiteStore) migrate() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS photos (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        filename   TEXT NOT NULL,
        path       TEXT NOT NULL,
        caption    TEXT,
        description TEXT,
        created_at DATETIME NOT NULL
    );`,
		// Add Tag Table
		`CREATE TABLE IF NOT EXISTS tags (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    );`,
		// Add Photo Tag table
		`CREATE TABLE IF NOT EXISTS photo_tags (
        photo_id INTEGER NOT NULL,
        tag_id   INTEGER NOT NULL,
        PRIMARY KEY (photo_id, tag_id),
        FOREIGN KEY (photo_id) REFERENCES photos(id),
        FOREIGN KEY (tag_id)   REFERENCES tags(id)
    );`,

		// Add ai chat message table
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

		// Add skill_notes table
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

		// Add skill_files table for references/assets
		`CREATE TABLE IF NOT EXISTS skill_files (
	        id INTEGER PRIMARY KEY AUTOINCREMENT,
	        skill_id TEXT NOT NULL,
	        path TEXT NOT NULL,
	        type TEXT NOT NULL CHECK(type IN ('file', 'dir')),
	        name TEXT NOT NULL,
	        content TEXT,
	        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	        UNIQUE(skill_id, path),
	        FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
	    );`,
		`CREATE INDEX IF NOT EXISTS idx_skill_files_skill_id ON skill_files(skill_id);`,
	}
	for _, q := range queries {
		if _, err := s.db.Exec(q); err != nil {
			return err
		}
	}
	return nil
}

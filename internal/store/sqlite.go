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
	queries := []string {
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
	}
	for _, q := range queries {
    if _, err := s.db.Exec(q); err != nil {
    return err
}
	}
	return nil
}

package store

import (
	"database/sql"
	"log"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
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

// migrate creates any tables that don't exist yet.
// Safe to run every startup — IF NOT EXISTS means it won't clobber existing data.
func (s *SQLiteStore) migrate() error {
    q := `CREATE TABLE IF NOT EXISTS photos (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        filename   TEXT NOT NULL,
        path       TEXT NOT NULL,
        caption    TEXT,
        description TEXT,
        created_at DATETIME NOT NULL
    );`
    _, err := s.db.Exec(q)
    return err
}

// SavePhoto inserts a new photo row into the database.
// It stamps CreatedAt on the struct and backfills the generated ID.
func (s *SQLiteStore) SavePhoto(p *model.Photo) error {
    p.CreatedAt = time.Now()

    res, err := s.db.Exec(
        `INSERT INTO photos (filename, path, caption, description, created_at) VALUES (?, ?, ?, ?, ?)`,
        p.Filename, p.Path, p.Caption, p.Description, p.CreatedAt,
    )
    if err != nil {
    log.Printf("SavePhoto error: %v", err)
        return err
    }


    // LastInsertId gives us the auto-generated ID so the caller gets a fully populated struct
    p.ID, err = res.LastInsertId()
    log.Printf("SavePhoto Successfully")
    return err
}

// ListPhotos returns all photos, newest first.
func (s *SQLiteStore) ListPhotos() ([]model.Photo, error) {
    rows, err := s.db.Query(`SELECT id, filename, path, caption, description, created_at FROM photos ORDER BY created_at DESC`)
    if err != nil {
        return nil, err
    }
    defer rows.Close() // always close rows when done to free the connection

    var photos []model.Photo
    for rows.Next() {
        var p model.Photo
        // Scan reads one column at a time into the struct fields — order must match SELECT
        if err := rows.Scan(&p.ID, &p.Filename, &p.Path, &p.Caption, &p.Description,  &p.CreatedAt); err != nil {
            return nil, err
        }
        photos = append(photos, p)
    }

    // rows.Err() catches any error that happened mid-iteration
    return photos, rows.Err()
}

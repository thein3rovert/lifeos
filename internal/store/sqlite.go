package store

import (
	"database/sql"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
	_ "modernc.org/sqlite"
)

type SQLiteStore struct {
	db *sql.DB
}

func NewSQLiteStore(dsn string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	s := &SQLiteStore{db:db}
	if err := s.migrate(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *SQLiteStore) migrate() error {
	query := `CREATE TABLE IF NOT EXISTS photos (
				 id         INTEGER PRIMARY KEY AUTOINCREMENT,
        filename   TEXT NOT NULL,
        path       TEXT NOT NULL,
        caption    TEXT,
        description TEXT,
        created_at DATETIME NOT NULL
	);`
	_, err := s.db.Exec(query)
	return err
}

func (s *SQLiteStore) SavePhoto(p *model.Photo) error {
    p.CreatedAt = time.Now()
    res, err := s.db.Exec(
        `INSERT INTO photos (filename, path, caption, description, created_at) VALUES (?, ?, ?, ?)`,
        p.Filename, p.Path, p.Caption, p.Description, p.CreatedAt,
    )
    if err != nil {
        return err
    }
    p.ID, err = res.LastInsertId()
    return err
}

func (s *SQLiteStore) ListPhotos() ([]model.Photo, error) {
    rows, err := s.db.Query(`SELECT id, filename, path, caption, description, created_at FROM photos ORDER BY created_at DESC`)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var photos []model.Photo
    for rows.Next() {
        var p model.Photo
        if err := rows.Scan(&p.ID, &p.Filename, &p.Path, &p.Caption,&p.Description, &p.CreatedAt); err != nil {
            return nil, err
        }
        photos = append(photos, p)
    }
    return photos, rows.Err()
}

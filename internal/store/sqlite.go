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

func (s *SQLiteStore) SaveTag(name string) (int64, error) {
	// INSERT OR IGNORE MEANS if the tag already exists, skip it
	_, err := s.db.Exec(`INSERT OR IGNORE INTO tags (name) VALUES (?)`, name)
	if err != nil {
		return 0, err
	}

	// After creating the tag fetch the id, if already existed a;sp fetch the id
	// used when we want to check if a tag already exist
	var id int64
	err = s.db.QueryRow(`SELECT id FROM tags WHERE name = ?`, name).Scan(&id)
	return id, err
}

// Make sure we cannot add duplcate tags to a photo
// AddTagToPhoto links a tag to a photo in the photo_tags join table
func (s *SQLiteStore) AddTagToPhoto(photoID, tagID int64) error {
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)`, photoID, tagID,
	)
	return err
}


// ListTags returns all tags - used for the autocomplete detalist
func (s *SQLiteStore) ListTags() ([]model.Tag, error) {
	rows, err := s.db.Query(`SELECT id, name FROM tags ORDER BY name`)
	// If unable to fetch tags
	if err != nil {
		return nil, err
	}

	var tags []model.Tag

	// Loop through the rolls and get the id and name
	for rows.Next() {
		var t model.Tag
		if err := rows.Scan(&t.ID, &t.Name); err != nil {
			return nil, err
		}
		// Append the result from the loop to tags
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// GetPhotoTags return all tags for a specific photo
func (s *SQLiteStore) GetPhotoTags(photoID int64) ([]model.Tag, error) {
	rows, err := s.db.Query(`
		SELECT t.id, t.name FROM tags t
		JOIN photo_tags pt ON pt.tag_id = t.id
		WHERE pt.photo_id = ?
		`, photoID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []model.Tag
	for rows.Next() {
		var t model.Tag
		if err := rows.Scan(&t.ID, &t.Name); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// Search photos by caption or filename
func (s *SQLiteStore) SearchPhotos(query string) ([]model.Photo, error) {
	// Filter the database for string pattern
	rows, err := s.db.Query(`
  SELECT id, filename, path, caption, description, created_at
        FROM photos
        WHERE caption LIKE ? OR filename LIKE ?
        ORDER BY created_at DESC`, "%"+query+"%", "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photoData []model.Photo
	for rows.Next() {
		var p model.Photo
		if err := rows.Scan(&p.ID, &p.Filename, &p.Path, &p.Caption, &p.Description, &p.CreatedAt); err != nil {
			return nil, err
		}

		// Fetch tags for each fetched photo
		photoTags, err := s.GetPhotoTags(p.ID)
		if err != nil {
			return nil, err
		}
		p.Tags = photoTags
		photoData = append(photoData, p)
	}
	return photoData, rows.Err()
}

func (s *SQLiteStore) GetPhotoByTag(tagName string) ([]model.Photo, error) {
	rows, err := s.db.Query(`
	 SELECT p.id, p.filename, p.path, p.caption, p.description, p.created_at
        FROM photos p
        JOIN photo_tags pt ON pt.photo_id = p.id
        JOIN tags t ON t.id = pt.tag_id
        WHERE t.name = ?
        ORDER BY p.created_at DESC`, tagName)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photoData []model.Photo
	for rows.Next() {
			var p model.Photo
			if err := rows.Scan(&p.ID, &p.Filename, &p.Path, &p.Caption, &p.Description, &p.CreatedAt); err != nil {
				return nil, err
	}

	// Fetch tags for each fetched photo
	photoTags, err := s.GetPhotoTags(p.ID)
	if err != nil {
		return nil, err
	}
	p.Tags = photoTags
 	photoData = append(photoData, p)
	}
	return photoData, rows.Err()
}

// Stub methods for skills (not implemented in SQLite)
func (s *SQLiteStore) ListSkills() ([]model.Skill, error) {
	return nil, nil
}

func (s *SQLiteStore) GetSkill(id string) (*model.Skill, error) {
	return nil, nil
}

func (s *SQLiteStore) SaveSkill(skill *model.Skill) error {
	return nil
}
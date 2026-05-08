package store

import (
	"database/sql"
	"log"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// PhotoStore implements Store interface for photos
type PhotoStore struct {
	db *sql.DB
}

// NewPhotoStore creates a photo store from an existing DB connection
func NewPhotoStore(db *sql.DB) *PhotoStore {
	return &PhotoStore{db: db}
}

// SavePhoto inserts a new photo row into the database.
func (s *PhotoStore) SavePhoto(p *model.Photo) error {
	p.CreatedAt = time.Now()

	res, err := s.db.Exec(
		`INSERT INTO photos (filename, path, caption, description, created_at) VALUES (?, ?, ?, ?, ?)`,
		p.Filename, p.Path, p.Caption, p.Description, p.CreatedAt,
	)
	if err != nil {
		log.Printf("SavePhoto error: %v", err)
		return err
	}

	p.ID, err = res.LastInsertId()
	log.Printf("SavePhoto Successfully")
	return err
}

// ListPhotos returns all photos, newest first.
func (s *PhotoStore) ListPhotos() ([]model.Photo, error) {
	rows, err := s.db.Query(`SELECT id, filename, path, caption, description, created_at FROM photos ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var photos []model.Photo
	for rows.Next() {
		var p model.Photo
		if err := rows.Scan(&p.ID, &p.Filename, &p.Path, &p.Caption, &p.Description, &p.CreatedAt); err != nil {
			return nil, err
		}
		photos = append(photos, p)
	}
	return photos, rows.Err()
}

// SaveTag creates a new tag or returns existing tag ID
func (s *PhotoStore) SaveTag(name string) (int64, error) {
	_, err := s.db.Exec(`INSERT OR IGNORE INTO tags (name) VALUES (?)`, name)
	if err != nil {
		return 0, err
	}

	var id int64
	err = s.db.QueryRow(`SELECT id FROM tags WHERE name = ?`, name).Scan(&id)
	return id, err
}

// AddTagToPhoto links a tag to a photo
func (s *PhotoStore) AddTagToPhoto(photoID, tagID int64) error {
	_, err := s.db.Exec(
		`INSERT OR IGNORE INTO photo_tags (photo_id, tag_id) VALUES (?, ?)`,
		photoID, tagID,
	)
	return err
}

// ListTags returns all tags
func (s *PhotoStore) ListTags() ([]model.Tag, error) {
	rows, err := s.db.Query(`SELECT id, name FROM tags ORDER BY name`)
	if err != nil {
		return nil, err
	}

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

// GetPhotoTags returns all tags for a specific photo
func (s *PhotoStore) GetPhotoTags(photoID int64) ([]model.Tag, error) {
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

// SearchPhotos searches photos by caption or filename
func (s *PhotoStore) SearchPhotos(query string) ([]model.Photo, error) {
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
		photoTags, err := s.GetPhotoTags(p.ID)
		if err != nil {
			return nil, err
		}
		p.Tags = photoTags
		photoData = append(photoData, p)
	}
	return photoData, rows.Err()
}

// GetPhotoByTag returns photos with a specific tag
func (s *PhotoStore) GetPhotoByTag(tagName string) ([]model.Photo, error) {
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
		photoTags, err := s.GetPhotoTags(p.ID)
		if err != nil {
			return nil, err
		}
		p.Tags = photoTags
		photoData = append(photoData, p)
	}
	return photoData, rows.Err()
}

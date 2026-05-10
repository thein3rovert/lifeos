package store

import "github.com/thein3rovert/lifeos/internal/model"

// Store is for photos (SQLite-backed)
type Store interface {
	SavePhoto(photo *model.Photo) error
	ListPhotos() ([]model.Photo, error)

	// Tags
	SaveTag(name string) (int64, error)
	AddTagToPhoto(photoID, tagID int64) error
	ListTags() ([]model.Tag, error)
	GetPhotoTags(photoID int64) ([]model.Tag, error)

	//Search
	SearchPhotos(query string) ([]model.Photo, error)
	GetPhotoByTag(tagName string) ([]model.Photo, error)
}

// SkillStore is for skills (file-based now, GitHub later)
type SkillStore interface {
	ListSkills() ([]model.Skill, error)
	GetSkill(id string) (*model.Skill, error)
	SaveSkill(skill *model.Skill) error
	Sync() error // Force refresh from source
}

// NoteStore is for buffered skill notes
type NoteStore interface {
	AddNote(skillID, title, content, noteType string) error
	GetNotesBySkill(skillID string) ([]model.Note, error)
	GetAllNotes() ([]model.Note, error)
	ClearNotes(skillID string) error
	DeleteNote(noteID int) error
	UpdateNote(noteID int, additionalContent string) error
	CountNotesBySkill(skillID string) (int, error)
	GetSkillNoteCounts() (map[string]int, error)
}

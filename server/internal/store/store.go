package store

import "github.com/thein3rovert/lifeos/server/internal/model"

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

package store

import "github.com/thein3rovert/lifeos/server/internal/model"

// SkillStore is for skills (SQL, GitHub, or any other backing).
type SkillStore interface {
	ListSkills() ([]model.Skill, error)
	GetSkill(id string) (*model.Skill, error)
	SaveSkill(skill *model.Skill) error
	Sync() error // Force refresh from source
}

// SkillPusher is implemented by skill stores that can push pending local
// changes back to their remote source (e.g. GitHub).
type SkillPusher interface {
	PushToGitHub() error
	GetPendingSkills() ([]model.Skill, error)
}

// SingleSkillPusher is implemented by skill stores that can push a single
// skill by ID.
type SingleSkillPusher interface {
	PushSingleSkill(skillID string) error
}

// SkillSessionStore is implemented by skill stores that track an
// OpenCode session ID per skill. Only the SQL-backed store implements
// this; the GitHub-backed store does not.
type SkillSessionStore interface {
	SetSessionID(skillID, sessionID string) error
}

// SkillFileStore is implemented by skill stores that manage per-skill
// reference/asset files (Markdown snippets, images, etc.).
type SkillFileStore interface {
	GetSkillFiles(skillID string) ([]model.SkillFile, error)
	GetSkillFileByPath(skillID, path string) (*model.SkillFile, error)
	SaveSkillFile(file *model.SkillFile) error
}

// NoteStore is for buffered skill notes.
type NoteStore interface {
	AddNote(skillID, title, content, noteType string) error
	GetNotesBySkill(skillID string) ([]model.Note, error)
	GetAllNotes() ([]model.Note, error)
	ClearNotes(skillID string) error
	DeleteNote(noteID int) error
	UpdateNote(noteID int, additionalContent string) error
	EditNote(noteID int, title, content string) error
	CountNotesBySkill(skillID string) (int, error)
	GetSkillNoteCounts() (map[string]int, error)
}

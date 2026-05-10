package notes

import (
	"database/sql"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
)

// NoteStore handles buffered notes for skills
type NoteStore struct {
	db *sql.DB
}

// New creates a new NoteStore
func New(db *sql.DB) *NoteStore {
	return &NoteStore{db: db}
}

// AddNote saves a new note snippet for a skill
func (s *NoteStore) AddNote(skillID, title, content, noteType string) error {
	if noteType == "" {
		noteType = "manual"
	}
	_, err := s.db.Exec(
		"INSERT INTO skill_notes (skill_id, title, content, type, created_at) VALUES (?, ?, ?, ?, ?)",
		skillID, title, content, noteType, time.Now(),
	)
	return err
}

// GetNotesBySkill returns all notes for a specific skill, ordered by creation time
func (s *NoteStore) GetNotesBySkill(skillID string) ([]model.Note, error) {
	rows, err := s.db.Query(
		"SELECT id, skill_id, title, content, type, created_at, updated_at FROM skill_notes WHERE skill_id = ? ORDER BY created_at ASC",
		skillID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []model.Note

	for rows.Next() {
		var n model.Note
		if err := rows.Scan(&n.ID, &n.SkillID, &n.Title, &n.Content, &n.Type, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

// DeleteNote removes a single note by ID
func (s *NoteStore) DeleteNote(noteID int) error {
	_, err := s.db.Exec("DELETE FROM skill_notes WHERE id = ?", noteID)
	return err
}

// UpdateNote appends content to an existing note with timestamp
func (s *NoteStore) UpdateNote(noteID int, additionalContent string) error {
	// Get current content
	var currentContent string
	err := s.db.QueryRow("SELECT content FROM skill_notes WHERE id = ?", noteID).Scan(&currentContent)
	if err != nil {
		return err
	}

	// Append new content with timestamp
	updatedContent := currentContent + "\n\n---\nUpdated: " + time.Now().Format("2006-01-02") + "\n\n" + additionalContent

	// Update the note
	_, err = s.db.Exec(
		"UPDATE skill_notes SET content = ?, updated_at = ? WHERE id = ?",
		updatedContent, time.Now(), noteID,
	)
	return err
}

// EditNote replaces the entire note content and title
func (s *NoteStore) EditNote(noteID int, title, content string) error {
	_, err := s.db.Exec(
		"UPDATE skill_notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
		title, content, time.Now(), noteID,
	)
	return err
}

// ClearNotes removes all notes for a skill (called after appending to skill)
func (s *NoteStore) ClearNotes(skillID string) error {
	_, err := s.db.Exec("DELETE FROM skill_notes WHERE skill_id = ?", skillID)
	return err
}

// CountNotesBySkill returns the number of notes for a specific skill
func (s *NoteStore) CountNotesBySkill(skillID string) (int, error) {
	var count int
	err := s.db.QueryRow(
		"SELECT COUNT(*) FROM skill_notes WHERE skill_id = ?",
		skillID,
	).Scan(&count)
	return count, err
}

// GetSkillNoteCounts returns a map of skill_id -> note count for all skills with notes
func (s *NoteStore) GetSkillNoteCounts() (map[string]int, error) {
	rows, err := s.db.Query(
		"SELECT skill_id, COUNT(*) FROM skill_notes GROUP BY skill_id",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var skillID string
		var count int
		if err := rows.Scan(&skillID, &count); err != nil {
			return nil, err
		}
		counts[skillID] = count
	}
	return counts, rows.Err()
}

// GetAllNotes returns all notes across all skills, ordered by creation time (newest first)
func (s *NoteStore) GetAllNotes() ([]model.Note, error) {
	rows, err := s.db.Query(
		"SELECT id, skill_id, title, content, type, created_at, updated_at FROM skill_notes ORDER BY created_at DESC",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notes []model.Note

	for rows.Next() {
		var n model.Note
		if err := rows.Scan(&n.ID, &n.SkillID, &n.Title, &n.Content, &n.Type, &n.CreatedAt, &n.UpdatedAt); err != nil {
			return nil, err
		}
		notes = append(notes, n)
	}
	return notes, rows.Err()
}

package service

import (
	"fmt"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/thein3rovert/lifeos/internal/store/notes"
)

type NoteService struct {
	noteStore  *notes.NoteStore
	skillStore *store.SQLSkillStore
}

func NewNoteService(noteStore *notes.NoteStore, skillStore *store.SQLSkillStore) *NoteService {
	return &NoteService{
		noteStore:  noteStore,
		skillStore: skillStore,
	}
}

// ============== Service Methods ==================

// CreateNote creates a new note with validation
func (s *NoteService) CreateNote(skillID, title, content, noteType string) error {
	if err := s.validateSkillExists(skillID); err != nil {
		return err
	}

	if err := validateNoteTitle(title); err != nil {
		return err
	}

	if err := validateNoteContent(content); err != nil {
		return err
	}

	validatedType, err := validateNoteType(noteType)
	if err != nil {
		return err
	}

	return s.noteStore.AddNote(skillID, title, content, validatedType)
}

// GetNotes retrieves all notes for a skill
func (s *NoteService) GetNotes(skillID string) ([]model.Note, error) {
	if err := s.validateSkillExists(skillID); err != nil {
		return nil, err
	}

	return s.noteStore.GetNotesBySkill(skillID)
}

// UpdateNote appends content to an existing note with timestamp
func (s *NoteService) UpdateNote(noteID int, content string) error {
	if err := validateNoteContent(content); err != nil {
		return err
	}

	return s.noteStore.UpdateNote(noteID, content)
}


// DeleteNote deletes a note by ID
func (s *NoteService) DeleteNote(noteID int) error {
	return s.noteStore.DeleteNote(noteID)
}

// GetAllNotes retrieves all notes across all skills
func (s *NoteService) GetAllNotes() ([]model.Note, error) {
	return s.noteStore.GetAllNotes()
}

// ClearNotes removes all notes for a skill
func (s *NoteService) ClearNotes(skillID string) error {
	if err := s.validateSkillExists(skillID); err != nil {
		return err
	}

	return s.noteStore.ClearNotes(skillID)
}


// ============== Validation Helpers ==================

// validateSkillExists checks if a skill exists
func (s *NoteService) validateSkillExists(skillID string) error {
	_, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return fmt.Errorf("skill not found: %w", err)
	}
	return nil
}

// validateNoteTitle validates that title is not empty
func validateNoteTitle(title string) error {
	if title == "" {
		return fmt.Errorf("note title is required")
	}
	return nil
}

// validateNoteContent validates that content is not empty
func validateNoteContent(content string) error {
	if content == "" {
		return fmt.Errorf("note content is required")
	}
	return nil
}

// validateNoteType validates and normalizes note type
func validateNoteType(noteType string) (string, error) {
	// Default to manual if not specified
	if noteType == "" {
		return "manual", nil
	}

	// Validate note type
	if noteType != "manual" && noteType != "ai-generated" {
		return "", fmt.Errorf("invalid note type: must be 'manual' or 'ai-generated'")
	}

	return noteType, nil
}

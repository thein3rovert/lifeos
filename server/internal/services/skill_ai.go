package service

import (
	"bytes"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/thein3rovert/lifeos/server/internal/model"
	"github.com/thein3rovert/lifeos/server/internal/sidecar"
	"github.com/thein3rovert/lifeos/server/internal/store"
	"github.com/thein3rovert/lifeos/server/internal/utils"
	"github.com/yuin/goldmark"
)

// SkillAIPreview is the result of an AI preview: the pre-save comparison
// between the current skill content and what the sidecar produced.
type SkillAIPreview struct {
	Skill          *model.Skill
	UpdatedContent string
	RenderedHTML   string
}

// SkillAIService orchestrates the AI skill-update workflow: gather notes,
// call the sidecar, save, and clear the note buffer. Handlers should stay
// thin request/response wrappers around this service.
type SkillAIService struct {
	skillStore store.SkillStore
	noteStore  store.NoteStore
	sidecar    *sidecar.Client
}

// NewSkillAIService constructs a SkillAIService.
func NewSkillAIService(skillStore store.SkillStore, noteStore store.NoteStore, sc *sidecar.Client) *SkillAIService {
	return &SkillAIService{
		skillStore: skillStore,
		noteStore:  noteStore,
		sidecar:    sc,
	}
}

// Sentinel errors so handlers can map to 400 vs 500 cleanly.
var (
	ErrSkillIDRequired = errors.New("skill ID is required")
	ErrNoNotes         = errors.New("no notes to preview")
	ErrNoNotesAppend   = errors.New("no notes to append")
)

// PreviewSkillUpdate returns an AI preview of the skill combined with all
// buffered notes. Does NOT save; caller decides whether to commit via Save.
func (s *SkillAIService) PreviewSkillUpdate(skillID string) (*SkillAIPreview, error) {
	if skillID == "" {
		return nil, ErrSkillIDRequired
	}

	notes, err := s.noteStore.GetNotesBySkill(skillID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notes: %w", err)
	}
	if len(notes) == 0 {
		return nil, ErrNoNotes
	}

	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return nil, fmt.Errorf("failed to get skill: %w", err)
	}

	updatedContent, err := s.sidecar.UpdateSkill(skill.Content, joinNotes(notes))
	if err != nil {
		log.Printf("Sidecar error: %v", err)
		return nil, fmt.Errorf("failed to update skill with AI: %w", err)
	}

	return &SkillAIPreview{
		Skill:          skill,
		UpdatedContent: updatedContent,
		RenderedHTML:   renderMarkdown(updatedContent),
	}, nil
}

// SaveSkillUpdate persists updatedContent to the skill and clears the note
// buffer. If the underlying skill store is GitHub-backed this creates a PR.
func (s *SkillAIService) SaveSkillUpdate(skillID, updatedContent string) error {
	if skillID == "" {
		return ErrSkillIDRequired
	}
	if updatedContent == "" {
		return errors.New("updated_content is required")
	}

	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return fmt.Errorf("failed to get skill: %w", err)
	}

	skill.Content = updatedContent
	if err := s.skillStore.SaveSkill(skill); err != nil {
		return fmt.Errorf("failed to save skill: %w", err)
	}

	if err := s.noteStore.ClearNotes(skillID); err != nil {
		// Best-effort — skill save succeeded, so don't fail the request
		log.Printf("Warning: failed to clear notes for skill %s: %v", skillID, err)
	}
	return nil
}

// AppendNotesToSkill runs the AI update AND persists in one step.
// Returns the updated skill.
func (s *SkillAIService) AppendNotesToSkill(skillID string) (*model.Skill, error) {
	if skillID == "" {
		return nil, ErrSkillIDRequired
	}

	notes, err := s.noteStore.GetNotesBySkill(skillID)
	if err != nil {
		return nil, fmt.Errorf("failed to get notes: %w", err)
	}
	if len(notes) == 0 {
		return nil, ErrNoNotesAppend
	}

	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return nil, fmt.Errorf("failed to get skill: %w", err)
	}

	updatedContent, err := s.sidecar.UpdateSkill(skill.Content, joinNotes(notes))
	if err != nil {
		log.Printf("Sidecar error: %v", err)
		return nil, fmt.Errorf("failed to update skill with AI: %w", err)
	}

	skill.Content = updatedContent
	if err := s.skillStore.SaveSkill(skill); err != nil {
		return nil, fmt.Errorf("failed to save skill: %w", err)
	}
	if err := s.noteStore.ClearNotes(skillID); err != nil {
		log.Printf("Warning: failed to clear notes for skill %s: %v", skillID, err)
	}
	return skill, nil
}

// RenderMarkdown strips YAML frontmatter and renders markdown to HTML.
// Pure function, no I/O — exposed on the service so handlers don't need
// to import goldmark or utils directly.
func (s *SkillAIService) RenderMarkdown(content string) string {
	if content == "" {
		return ""
	}
	return renderMarkdown(content)
}

// ── helpers ────────────────────────────────────────────────────────

func joinNotes(notes []model.Note) string {
	var b strings.Builder
	for i, note := range notes {
		if i > 0 {
			b.WriteString("\n\n")
		}
		b.WriteString(note.Content)
	}
	return b.String()
}

func renderMarkdown(content string) string {
	md := utils.StripFrontmatter(content)
	var buf bytes.Buffer
	if err := goldmark.Convert([]byte(md), &buf); err != nil {
		return md // fall back to raw
	}
	return buf.String()
}

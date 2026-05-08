package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/yuin/goldmark"
)

// AIHandler holds dependencies for AI workflow API endpoints
type AIHandler struct {
	skillStore store.SkillStore
	noteStore  store.NoteStore
}

// NewAIHandler creates a new AI workflow API handler
func NewAIHandler(skillStore store.SkillStore, noteStore store.NoteStore) *AIHandler {
	return &AIHandler{
		skillStore: skillStore,
		noteStore:  noteStore,
	}
}

// PreviewSkillUpdate calls the sidecar to get an AI-updated skill and returns the preview
// POST /api/skills/{id}/preview
func (h *AIHandler) PreviewSkillUpdate(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	// Get notes for this skill
	notes, err := h.noteStore.GetNotesBySkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get notes")
		return
	}
	if len(notes) == 0 {
		respondError(w, http.StatusBadRequest, "no notes to preview")
		return
	}

	// Get current skill
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get skill")
		return
	}

	// Build notes string
	var notesBuilder strings.Builder
	for i, note := range notes {
		if i > 0 {
			notesBuilder.WriteString("\n\n")
		}
		notesBuilder.WriteString(note.Content)
	}

	// Call sidecar for AI update
	updatedContent, err := callSideCarForSkillUpdate(skill.Content, notesBuilder.String())
	if err != nil {
		log.Printf("Sidecar error: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to update skill with AI: "+err.Error())
		return
	}

	// Render markdown to HTML
	markdownContent := stripMarkdownFrontMatter(updatedContent)
	var buf bytes.Buffer
	if err := goldmark.Convert([]byte(markdownContent), &buf); err != nil {
		buf.WriteString(markdownContent)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"skill_id":          skill.ID,
		"title":             skill.Title,
		"original_content":  skill.Content,
		"updated_content":   updatedContent,
		"rendered_html":     buf.String(),
	})
}

// SaveSkillUpdateRequest is the JSON body for saving an AI-updated skill
type SaveSkillUpdateRequest struct {
	UpdatedContent string `json:"updated_content"`
}

// SaveSkillUpdate saves the AI-updated skill (creates PR) and clears buffer notes
// POST /api/skills/{id}/save
func (h *AIHandler) SaveSkillUpdate(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	var req SaveSkillUpdateRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.UpdatedContent == "" {
		respondError(w, http.StatusBadRequest, "updated_content is required")
		return
	}

	// Get current skill
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get skill")
		return
	}

	// Update content
	skill.Content = req.UpdatedContent

	// Save (creates PR on GitHub)
	if err := h.skillStore.SaveSkill(skill); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save skill: "+err.Error())
		return
	}

	// Clear buffer notes
	if err := h.noteStore.ClearNotes(skillID); err != nil {
		log.Printf("Warning: failed to clear notes for skill %s: %v", skillID, err)
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"status":   "saved",
		"skill_id": skillID,
	})
}

// RenderMarkdownRequest is the JSON body for rendering markdown
type RenderMarkdownRequest struct {
	Content string `json:"content"`
}

// RenderMarkdown renders markdown content to HTML
// POST /api/skills/preview-render
func (h *AIHandler) RenderMarkdown(w http.ResponseWriter, r *http.Request) {
	var req RenderMarkdownRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Content == "" {
		respondJSON(w, http.StatusOK, map[string]string{"html": ""})
		return
	}

	markdownContent := stripMarkdownFrontMatter(req.Content)
	var buf bytes.Buffer
	if err := goldmark.Convert([]byte(markdownContent), &buf); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to render markdown")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"html": buf.String()})
}

// AppendNotesToSkill appends all buffer notes to skill content via AI and saves
// POST /api/skills/{id}/notes/append
func (h *AIHandler) AppendNotesToSkill(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	// Get all notes for this skill
	notes, err := h.noteStore.GetNotesBySkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get notes")
		return
	}

	if len(notes) == 0 {
		respondError(w, http.StatusBadRequest, "no notes to append")
		return
	}

	// Get current skill
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get skill")
		return
	}

	// Build notes string
	var notesBuilder strings.Builder
	for i, note := range notes {
		if i > 0 {
			notesBuilder.WriteString("\n\n")
		}
		notesBuilder.WriteString(note.Content)
	}

	// Call sidecar for AI update
	updatedContent, err := callSideCarForSkillUpdate(skill.Content, notesBuilder.String())
	if err != nil {
		log.Printf("Sidecar error: %v", err)
		respondError(w, http.StatusInternalServerError, "failed to update skill with AI: "+err.Error())
		return
	}

	// Update and save
	skill.Content = updatedContent
	if err := h.skillStore.SaveSkill(skill); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save skill: "+err.Error())
		return
	}

	// Clear notes
	if err := h.noteStore.ClearNotes(skillID); err != nil {
		log.Printf("Warning: failed to clear notes for skill %s: %v", skillID, err)
	}

	respondJSON(w, http.StatusOK, skillToResponse(skill))
}

// callSideCarForSkillUpdate calls the Node.js sidecar for AI skill updates
// TODO: extract to shared client or dedicated package
func callSideCarForSkillUpdate(existingSkill, newNotes string) (string, error) {
	type sidecarRequest struct {
		ExistingSkill string `json:"existingSkill"`
		NewNotes      string `json:"newNotes"`
	}
	type sidecarResponse struct {
		UpdatedSkill string `json:"updatedSkill"`
		Error        string `json:"error"`
	}

	payload := sidecarRequest{
		ExistingSkill: existingSkill,
		NewNotes:      newNotes,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	// Get sidecar URL from env or use default
	sidecarURL := os.Getenv("SIDECAR_URL")
	if sidecarURL == "" {
		sidecarURL = "http://localhost:3002"
	}

	response, err := http.Post(sidecarURL+"/skill/update", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(response.Body)
		return "", fmt.Errorf("sidecar returned %d: %s", response.StatusCode, string(body))
	}

	var result sidecarResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.Error != "" {
		return "", fmt.Errorf("sidecar error: %s", result.Error)
	}

	return result.UpdatedSkill, nil
}

// stripMarkdownFrontMatter removes YAML frontmatter from markdown content
// TODO: move to shared util
func stripMarkdownFrontMatter(content string) string {
	if !strings.HasPrefix(content, "---") {
		return content
	}

	lines := strings.Split(content, "\n")
	inFrontmatter := true
	var result []string

	for i, line := range lines {
		if i == 0 && line == "---" {
			continue
		}
		if inFrontmatter && line == "---" {
			inFrontmatter = false
			continue
		}
		if !inFrontmatter {
			result = append(result, line)
		}
	}

	return strings.Join(result, "\n")
}
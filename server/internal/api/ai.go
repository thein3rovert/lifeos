package api

import (
	"errors"
	"net/http"

	skillsapi "github.com/thein3rovert/lifeos/server/internal/api/skills"
	service "github.com/thein3rovert/lifeos/server/internal/services"
)

// AIHandler is a thin HTTP wrapper around service.SkillAIService.
// All orchestration (note joining, sidecar dispatch, markdown rendering,
// save+clear) lives in the service so it can be reused and tested.
type AIHandler struct {
	aiService *service.SkillAIService
}

// NewAIHandler creates a new AI workflow API handler.
func NewAIHandler(aiService *service.SkillAIService) *AIHandler {
	return &AIHandler{aiService: aiService}
}

// mapServiceError maps a service-layer error to an HTTP status code.
func mapServiceError(err error) int {
	switch {
	case errors.Is(err, service.ErrSkillIDRequired),
		errors.Is(err, service.ErrNoNotes),
		errors.Is(err, service.ErrNoNotesAppend):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}

// PreviewSkillUpdate returns an AI preview of the skill combined with buffered notes.
// POST /api/skills/{id}/preview
func (h *AIHandler) PreviewSkillUpdate(w http.ResponseWriter, r *http.Request) {
	preview, err := h.aiService.PreviewSkillUpdate(r.PathValue("id"))
	if err != nil {
		RespondError(w, mapServiceError(err), err.Error())
		return
	}

	RespondJSON(w, http.StatusOK, map[string]interface{}{
		"skill_id":         preview.Skill.ID,
		"title":            preview.Skill.Title,
		"original_content": preview.Skill.Content,
		"updated_content":  preview.UpdatedContent,
		"rendered_html":    preview.RenderedHTML,
	})
}

// SaveSkillUpdateRequest is the JSON body for saving an AI-updated skill.
type SaveSkillUpdateRequest struct {
	UpdatedContent string `json:"updated_content"`
}

// SaveSkillUpdate saves the AI-updated skill and clears buffer notes.
// POST /api/skills/{id}/save
func (h *AIHandler) SaveSkillUpdate(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")

	var req SaveSkillUpdateRequest
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.aiService.SaveSkillUpdate(skillID, req.UpdatedContent); err != nil {
		RespondError(w, mapServiceError(err), err.Error())
		return
	}

	RespondJSON(w, http.StatusOK, map[string]string{
		"status":   "saved",
		"skill_id": skillID,
	})
}

// RenderMarkdownRequest is the JSON body for rendering markdown.
type RenderMarkdownRequest struct {
	Content string `json:"content"`
}

// RenderMarkdown renders markdown content to HTML.
// POST /api/skills/preview-render
func (h *AIHandler) RenderMarkdown(w http.ResponseWriter, r *http.Request) {
	var req RenderMarkdownRequest
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	RespondJSON(w, http.StatusOK, map[string]string{
		"html": h.aiService.RenderMarkdown(req.Content),
	})
}

// AppendNotesToSkill appends all buffer notes to skill content via AI and saves.
// POST /api/skills/{id}/notes/append
func (h *AIHandler) AppendNotesToSkill(w http.ResponseWriter, r *http.Request) {
	skill, err := h.aiService.AppendNotesToSkill(r.PathValue("id"))
	if err != nil {
		RespondError(w, mapServiceError(err), err.Error())
		return
	}
	RespondJSON(w, http.StatusOK, skillsapi.SkillToResponse(skill))
}

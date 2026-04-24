package api

import (
	"net/http"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
)

// SkillHandler holds dependencies for skill API endpoints
type SkillHandler struct {
	skillStore store.SkillStore
	noteStore  store.NoteStore
}

// NewSkillHandler creates a new skill API handler
func NewSkillHandler(skillStore store.SkillStore, noteStore store.NoteStore) *SkillHandler {
	return &SkillHandler{
		skillStore: skillStore,
		noteStore:  noteStore,
	}
}

// SkillResponse is the JSON shape returned by skill endpoints
type SkillResponse struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Format    string `json:"format"`
	Content   string `json:"content"`
	UpdatedAt string `json:"updated_at"`
}

// SkillDetailResponse includes notes alongside the skill
type SkillDetailResponse struct {
	Skill SkillResponse  `json:"skill"`
	Notes []NoteResponse `json:"notes"`
}

// skillToResponse converts a model.Skill to a SkillResponse
func skillToResponse(s *model.Skill) SkillResponse {
	return SkillResponse{
		ID:        s.ID,
		Title:     s.Title,
		Format:    s.Format,
		Content:   s.Content,
		UpdatedAt: s.UpdatedAt.Format(time.RFC3339),
	}
}

// ListSkills returns all skills as JSON
// GET /api/skills
func (h *SkillHandler) ListSkills(w http.ResponseWriter, r *http.Request) {
	skills, err := h.skillStore.ListSkills()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list skills")
		return
	}

	var resp []SkillResponse
	for _, s := range skills {
		resp = append(resp, skillToResponse(&s))
	}

	respondJSON(w, http.StatusOK, resp)
}

// GetSkill returns a single skill by ID with its notes
// GET /api/skills/{id}
func (h *SkillHandler) GetSkill(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")

	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get skill")
		return
	}

	notes, _ := h.noteStore.GetNotesBySkill(skillID)

	resp := SkillDetailResponse{
		Skill: skillToResponse(skill),
	}
	// Get Skill note from response
	var skillNotes = resp.Notes

	for _, n := range notes {
		skillNotes = append(skillNotes, noteToResponse(&n))
	}

	respondJSON(w, http.StatusOK, resp)
}

// JSON body required for editing a skill
// TODO: Move later to util
type EditSkillRequest struct {
	SkillID string `json:"skill_id"`
	Content string `json:"content"`
}

// EditSkill updates skill content
// POST /api/skills/edit
func (h *SkillHandler) EditSkill(w http.ResponseWriter, r *http.Request) {
	var req EditSkillRequest

	// Get skill content and id from request
	var skillContent = req.Content
	var skillID = req.SkillID

	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Check if skill id and content are provided or empty
	if skillID == "" || skillContent == "" {
		respondError(w, http.StatusBadRequest, "skill_id and content are required")
		return
	}

	// If true, get skill using skill id
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get skill")
		return
	}

	// if true, save skill content after changes have
	// been made to skill
	skill.Content = skillContent
	if err := h.skillStore.SaveSkill(skill); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save skill")
		return
	}

	respondJSON(w, http.StatusOK, skillToResponse(skill))
}

// SyncSkills forces a refresh of skills from GitHub
// Doing this to avoid having to pull from github each time
// GET /api/skills/sync
func (h *SkillHandler) SyncSkills(w http.ResponseWriter, r *http.Request) {
	if err := h.skillStore.Sync(); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to sync skills")
		return
	}

	// Return fresh list after sync
	skills, err := h.skillStore.ListSkills()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list skills after sync")
		return
	}

	var resp []SkillResponse
	for _, s := range skills {
		resp = append(resp, skillToResponse(&s))
	}

	respondJSON(w, http.StatusOK, resp)
}

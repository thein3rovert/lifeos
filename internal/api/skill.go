package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
)

// ===============================
// TYPES
// ===============================

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
	ID          string `json:"id"`
	Title       string `json:"title"`
	Format      string `json:"format"`
	Content     string `json:"content"`
	UpdatedAt   string `json:"updated_at"`
	SyncedAt    string `json:"synced_at"`
	PendingSync bool   `json:"pending_sync"`
	NoteCount   int    `json:"note_count"`
}

// SkillDetailResponse includes notes alongside the skill
type SkillDetailResponse struct {
	Skill SkillResponse  `json:"skill"`
	Notes []NoteResponse `json:"notes"`
}

type CreateNewSkillRequest struct {
	Title   string `json:"title"`
	Format  string `json:"format"`
	Content string `json:"content"`
}

// Create new skills
// POST /api/skills/create

func (createSkillHandler *SkillHandler) CreateNewSkill(w http.ResponseWriter, r *http.Request) {
	var createSkillRequest CreateNewSkillRequest

	if err := decodeJSON(r, &createSkillRequest); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body, unable to decode json")
		return
	}

	// Validate require fields
	if createSkillRequest.Title == "" || createSkillRequest.Content == "" {
		respondError(w, http.StatusBadRequest, "title and content for new skill is required, please provide")
		return
	}

	//Generate skill id from title
	skillID := strings.ToLower(strings.ReplaceAll(createSkillRequest.Title, " ", "_"))
	skillID = strings.ReplaceAll(skillID, "_", "_")

	//Check if skill already exists in the database
	existingSkills, _ := createSkillHandler.skillStore.GetSkill(skillID)
	if existingSkills != nil {
		respondError(w, http.StatusConflict, "skill with this name already exists")
		return
	}

	// Create the skill
	newSkill := &model.Skill{
		ID:          skillID,
		Title:       createSkillRequest.Title,
		Content:     createSkillRequest.Content,
		Format:      createSkillRequest.Format,
		UpdatedAt:   time.Now(),
		PendingSync: true,
	}

	// Save skill to database
	if err := createSkillHandler.skillStore.SaveSkill(newSkill); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create new skills: "+err.Error())
		return
	}

	// Return the created skill after creation
	respondJSON(w, http.StatusCreated, skillToResponse(newSkill))

}

// skillToResponse converts a model.Skill to a SkillResponse
func skillToResponse(s *model.Skill) SkillResponse {
	return skillToResponseWithNotes(s, 0)
}

// skillToResponseWithNotes converts a model.Skill to a SkillResponse with note count
func skillToResponseWithNotes(s *model.Skill, noteCount int) SkillResponse {
	resp := SkillResponse{
		ID:          s.ID,
		Title:       s.Title,
		Format:      s.Format,
		Content:     s.Content,
		UpdatedAt:   s.UpdatedAt.Format(time.RFC3339),
		PendingSync: s.PendingSync,
		NoteCount:   noteCount,
	}

	if !s.SyncedAt.IsZero() {
		resp.SyncedAt = s.SyncedAt.Format(time.RFC3339)
	}

	return resp
}

// ListSkills returns all skills as JSON with note counts
// GET /api/skills
func (h *SkillHandler) ListSkills(w http.ResponseWriter, r *http.Request) {
	skills, err := h.skillStore.ListSkills()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list skills")
		return
	}

	// Get note counts for all skills
	noteCounts, _ := h.noteStore.GetSkillNoteCounts()

	var resp []SkillResponse
	for _, s := range skills {
		resp = append(resp, skillToResponseWithNotes(&s, noteCounts[s.ID]))
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

	// Convert notes to response format
	var noteResponses []NoteResponse
	for _, n := range notes {
		noteResponses = append(noteResponses, noteToResponse(&n))
	}

	resp := SkillDetailResponse{
		Skill: skillToResponse(skill),
		Notes: noteResponses,
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

	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Check if skill id and content are provided or empty
	if req.SkillID == "" || req.Content == "" {
		respondError(w, http.StatusBadRequest, "skill_id and content are required")
		return
	}

	// If true, get skill using skill id
	skill, err := h.skillStore.GetSkill(req.SkillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get skill")
		return
	}

	// if true, save skill content after changes have
	// been made to skill
	skill.Content = req.Content
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

// Pusher interface for skills that support pushing to GitHub
type SkillPusher interface {
	PushToGitHub() error
	GetPendingSkills() ([]model.Skill, error)
}

// PushSkills pushes pending local changes to GitHub
// POST /api/skills/push
func (h *SkillHandler) PushSkills(w http.ResponseWriter, r *http.Request) {
	pusher, ok := h.skillStore.(SkillPusher)
	if !ok {
		respondError(w, http.StatusNotImplemented, "push not supported by current skill store")
		return
	}

	// Get pending skills count first
	pending, err := pusher.GetPendingSkills()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get pending skills")
		return
	}

	if len(pending) == 0 {
		respondJSON(w, http.StatusOK, map[string]interface{}{
			"message": "No pending changes to push",
			"pushed":  0,
		})
		return
	}

	// Push to GitHub
	if err := pusher.PushToGitHub(); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to push skills: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Skills pushed successfully",
		"pushed":  len(pending),
	})
}

// Pusher interface extension for single skill push
type SingleSkillPusher interface {
	PushSingleSkill(skillID string) error
}

// PushSingleSkill pushes a single skill to GitHub
// POST /api/skills/{id}/push
func (h *SkillHandler) PushSingleSkill(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	pusher, ok := h.skillStore.(SingleSkillPusher)
	if !ok {
		respondError(w, http.StatusNotImplemented, "single skill push not supported")
		return
	}

	// Push single skill
	if err := pusher.PushSingleSkill(skillID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to push skill: "+err.Error())
		return
	}

	// Get updated skill
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get updated skill")
		return
	}

	respondJSON(w, http.StatusOK, skillToResponse(skill))
}

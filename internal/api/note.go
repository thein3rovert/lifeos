package api

import (
	"net/http"
	"strconv"

	"github.com/thein3rovert/lifeos/internal/model"
	service "github.com/thein3rovert/lifeos/internal/services"
)

// Holds dependencies for note API endpoints
type NoteHandler struct {
	noteService *service.NoteService
}

// NewNoteHandler creates a new note API handler
func NewNoteHandler(noteService *service.NoteService) *NoteHandler {
	return &NoteHandler{noteService: noteService}
}

type NoteResponse struct {
	ID        int     `json:"id"`
	SkillID   string  `json:"skill_id"`
	Title     string  `json:"title"`
	Content   string  `json:"content"`
	Type      string  `json:"type"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt *string `json:"updated_at,omitempty"`
}

// Map note response to note model
func noteToResponse(n *model.Note) NoteResponse {
	var updatedAt *string
	if n.UpdatedAt != nil {
		updatedAtStr := n.UpdatedAt.String()
		updatedAt = &updatedAtStr
	}

	return NoteResponse{
		ID:        n.ID,
		SkillID:   n.SkillID,
		Title:     n.Title,
		Content:   n.Content,
		Type:      n.Type,
		CreatedAt: n.CreatedAt.String(),
		UpdatedAt: updatedAt,
	}
}

// Returns all notes for a skill
// GET /api/skills/{id}/notes
func (h *NoteHandler) GetNotes(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	notes, err := h.noteService.GetNotes(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var resp []NoteResponse
	for _, n := range notes {
		resp = append(resp, noteToResponse(&n))
	}

	respondJSON(w, http.StatusOK, resp)
}

// JSON body for adding a note
type AddNoteRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Type    string `json:"type,omitempty"` // optional, defaults to "manual"
}

// adds a buffer note to a skill
// POST /api/skills/{id}/notes
func (h *NoteHandler) AddNote(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	var req AddNoteRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.noteService.CreateNote(skillID, req.Title, req.Content, req.Type); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	notes, _ := h.noteService.GetNotes(skillID)
	var resp []NoteResponse
	for _, n := range notes {
		resp = append(resp, noteToResponse(&n))
	}

	respondJSON(w, http.StatusCreated, resp)
}

// DeleteNote removes a single buffer note
// DELETE /api/skills/{id}/notes/{noteId}
func (h *NoteHandler) DeleteNote(w http.ResponseWriter, r *http.Request) {
	noteIDStr := r.PathValue("noteId")
	if noteIDStr == "" {
		respondError(w, http.StatusBadRequest, "note ID is required")
		return
	}

	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid note ID")
		return
	}

	if err := h.noteService.DeleteNote(noteID); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type UpdateNoteRequest struct {
	Content string `json:"content"`
}

// UpdateNote appends content to an existing note
// PUT /api/skills/{id}/notes/{noteId}
func (h *NoteHandler) UpdateNote(w http.ResponseWriter, r *http.Request) {
	noteIDStr := r.PathValue("noteId")
	if noteIDStr == "" {
		respondError(w, http.StatusBadRequest, "note ID is required")
		return
	}

	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid note ID")
		return
	}

	var req UpdateNoteRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.noteService.UpdateNote(noteID, req.Content); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Returns all notes across all skills
// GET /api/notes
func (h *NoteHandler) GetAllNotes(w http.ResponseWriter, r *http.Request) {
	notes, err := h.noteService.GetAllNotes()
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var resp []NoteResponse
	for _, n := range notes {
		resp = append(resp, noteToResponse(&n))
	}

	respondJSON(w, http.StatusOK, resp)
}

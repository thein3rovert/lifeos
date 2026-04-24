package api

import (
	"net/http"
	"strconv"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
)

// Holds dependencies for note API endpoints
type NoteHandler struct {
	noteStore store.NoteStore
}

// NewNoteHandler creates a new note API handler
func NewNoteHandler(noteStore store.NoteStore) *NoteHandler {
	return &NoteHandler{noteStore: noteStore}
}

type NoteResponse struct {
	ID        int    `json:"id"`
	SkillID   string `json:"skill_id"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// Map note response to note model
func noteToResponse(n *model.Note) NoteResponse {
	return NoteResponse{
		ID:        n.ID,
		SkillID:   n.SkillID,
		Content:   n.Content,
		CreatedAt: n.CreatedAt.String(),
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

	notes, err := h.noteStore.GetNotesBySkill(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to get notes")
		return
	}

	var resp []NoteResponse

	for _, n := range notes {
		resp = append(resp, noteToResponse(&n))
	}

	respondJSON(w, http.StatusOK, resp)
}



// JSON body for adding a note, since all
// it takes is  the note content
type AddNoteRequest struct {
	Content string `json:"content"`
}

// adds a buffer note to a skill, the more learning
// the more the notes get updated
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

	if req.Content == "" {
		respondError(w, http.StatusBadRequest, "content is required")
		return
	}

	if err := h.noteStore.AddNote(skillID, req.Content); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to add note")
		return
	}

	notes, _ := h.noteStore.GetNotesBySkill(skillID)
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

	if err := h.noteStore.DeleteNote(noteID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete note")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

package api

import (
	"net/http"
	"strconv"

	"github.com/thein3rovert/lifeos/server/internal/httpjson"
	service "github.com/thein3rovert/lifeos/server/internal/services"
)

// Holds dependencies for note API endpoints
type NoteHandler struct {
	noteService *service.NoteService
}

// NewNoteHandler creates a new note API handler
func NewNoteHandler(noteService *service.NoteService) *NoteHandler {
	return &NoteHandler{noteService: noteService}
}

// NoteResponse is aliased from httpjson so callers already importing "api"
// keep the api.NoteResponse identifier while the underlying shape lives in
// one place (httpjson) that api/skills also uses without an import cycle.
type NoteResponse = httpjson.NoteResponse

// NoteToResponse converts a model.Note into its JSON response shape.
var NoteToResponse = httpjson.NoteToResponse

// Returns all notes for a skill
// GET /api/skills/{id}/notes
func (h *NoteHandler) GetNotes(w http.ResponseWriter, r *http.Request) {
	skillID := r.PathValue("id")
	if skillID == "" {
		RespondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	notes, err := h.noteService.GetNotes(skillID)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var resp []NoteResponse
	for _, n := range notes {
		resp = append(resp, NoteToResponse(&n))
	}

	RespondJSON(w, http.StatusOK, resp)
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
		RespondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	var req AddNoteRequest
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.noteService.CreateNote(skillID, req.Title, req.Content, req.Type); err != nil {
		RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	notes, _ := h.noteService.GetNotes(skillID)
	var resp []NoteResponse
	for _, n := range notes {
		resp = append(resp, NoteToResponse(&n))
	}

	RespondJSON(w, http.StatusCreated, resp)
}

// DeleteNote removes a single buffer note
// DELETE /api/skills/{id}/notes/{noteId}
func (h *NoteHandler) DeleteNote(w http.ResponseWriter, r *http.Request) {
	noteIDStr := r.PathValue("noteId")
	if noteIDStr == "" {
		RespondError(w, http.StatusBadRequest, "note ID is required")
		return
	}

	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid note ID")
		return
	}

	if err := h.noteService.DeleteNote(noteID); err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	RespondJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

type UpdateNoteRequest struct {
	Content string `json:"content"`
}

// UpdateNote appends content to an existing note
// PUT /api/skills/{id}/notes/{noteId}
func (h *NoteHandler) UpdateNote(w http.ResponseWriter, r *http.Request) {
	noteIDStr := r.PathValue("noteId")
	if noteIDStr == "" {
		RespondError(w, http.StatusBadRequest, "note ID is required")
		return
	}

	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid note ID")
		return
	}

	var req UpdateNoteRequest
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.noteService.UpdateNote(noteID, req.Content); err != nil {
		RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

type EditNoteRequest struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

// EditNote fully replaces note title and content
// PATCH /api/skills/{id}/notes/{noteId}
func (h *NoteHandler) EditNote(w http.ResponseWriter, r *http.Request) {
	noteIDStr := r.PathValue("noteId")
	if noteIDStr == "" {
		RespondError(w, http.StatusBadRequest, "note ID is required")
		return
	}

	noteID, err := strconv.Atoi(noteIDStr)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid note ID")
		return
	}

	var req EditNoteRequest
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.noteService.EditNote(noteID, req.Title, req.Content); err != nil {
		RespondError(w, http.StatusBadRequest, err.Error())
		return
	}

	RespondJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Returns all notes across all skills
// GET /api/notes
func (h *NoteHandler) GetAllNotes(w http.ResponseWriter, r *http.Request) {
	notes, err := h.noteService.GetAllNotes()
	if err != nil {
		RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var resp []NoteResponse
	for _, n := range notes {
		resp = append(resp, NoteToResponse(&n))
	}

	RespondJSON(w, http.StatusOK, resp)
}

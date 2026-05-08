package api

import (
	"net/http"

	"github.com/thein3rovert/lifeos/internal/store"
)

// TagHandler holds dependencies for tag API endpoints
type TagHandler struct {
	store store.Store
}

// NewTagHandler creates a new tag API handler
func NewTagHandler(s store.Store) *TagHandler {
	return &TagHandler{store: s}
}

// TagResponse is the JSON shape for a tag
type TagResponse struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// ListTags returns all tags as JSON
// GET /api/tags
func (h *TagHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.store.ListTags()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to list tags")
		return
	}

	var resp []TagResponse
	for _, t := range tags {
		resp = append(resp, TagResponse{ID: t.ID, Name: t.Name})
	}

	respondJSON(w, http.StatusOK, resp)
}

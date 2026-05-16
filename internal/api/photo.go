package api

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
)

// Holds dependencies for photo API endpoints
type PhotoHandler struct {
	store store.Store
}

// Creates a new photo API handler
func NewPhotoHandler(s store.Store) *PhotoHandler {
	return &PhotoHandler{store: s}
}

// ListPhotos returns all photos as JSON
// GET /api/photos
func (h *PhotoHandler) ListPhotos(w http.ResponseWriter, r *http.Request) {
	photos, err := h.store.ListPhotos()
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "failed to list photos")
		return
	}
	RespondJSON(w, http.StatusOK, photos)
}

// GetPhoto returns a single photo by ID
// GET /api/photos/{id}
func (h *PhotoHandler) GetPhoto(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	if idStr == "" {
		RespondError(w, http.StatusBadRequest, "photo ID is required")
		return
	}

	var photo model.Photo
	var found bool

	// Get all photos and find the one with matching ID
	// TODO: Add GetPhotoByID to store interface
	photos, err := h.store.ListPhotos()
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "failed to get photo")
		return
	}

	for _, p := range photos {
		if fmt.Sprintf("%d", p.ID) == idStr {
			photo = p
			found = true
			break
		}
	}

	if !found {
		RespondError(w, http.StatusNotFound, "photo not found")
		return
	}

	// Fetch tags for this photo
	tags, _ := h.store.GetPhotoTags(photo.ID)
	photo.Tags = tags

	RespondJSON(w, http.StatusOK, photo)
}

// UploadPhoto handles photo upload via multipart form
// POST /api/photos/upload
func (h *PhotoHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		RespondError(w, http.StatusBadRequest, "failed to parse form")
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		RespondError(w, http.StatusBadRequest, "photo file is required")
		return
	}
	defer file.Close()

	if err := os.MkdirAll("photos", 0755); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not create photos directory")
		return
	}

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
	savePath := filepath.Join("photos", filename)

	destination, err := os.Create(savePath)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not save file")
		return
	}
	defer destination.Close()

	if _, err := io.Copy(destination, file); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not write file")
		return
	}

	photo := &model.Photo{
		Filename: header.Filename,
		Path:     savePath,
		Caption:  r.FormValue("caption"),
	}

	if err := h.store.SavePhoto(photo); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not save photo metadata")
		return
	}

	// Handle tags
	tagsValue := r.FormValue("tags")
	if tagsValue != "" {
		for _, tagName := range strings.Fields(tagsValue) {
			tagID, err := h.store.SaveTag(tagName)
			if err != nil {
				continue
			}
			h.store.AddTagToPhoto(photo.ID, tagID)
		}
	}

	RespondJSON(w, http.StatusCreated, photo)
}

// SearchPhotos searches photos by query string
// GET /api/photos/search?q=...
func (h *PhotoHandler) SearchPhotos(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")

	var photos []model.Photo
	var err error

	if strings.HasPrefix(query, "tags:") {
		tagName := strings.TrimPrefix(query, "tags:")
		photos, err = h.store.GetPhotoByTag(tagName)
	} else if query == "" {
		photos, err = h.store.ListPhotos()
	} else {
		photos, err = h.store.SearchPhotos(query)
	}

	if err != nil {
		RespondError(w, http.StatusInternalServerError, "failed to search photos")
		return
	}

	RespondJSON(w, http.StatusOK, map[string]interface{}{
		"photos":       photos,
		"search_query": query,
	})
}

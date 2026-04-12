package handler

import (
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
)

func Photos(w http.ResponseWriter, r *http.Request) {
	// w.Write([]byte("photo page"))

	// Integrate template
	tmpl := template.Must(template.ParseFiles(
		"templates/base.html",
		"templates/photos.html",
	))
	tmpl.ExecuteTemplate(w, "base", nil)
}

// List returns a handler that fetches all photos and renders the template
func ListPhotos(s store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		photos, err := s.ListPhotos()
		if err != nil {
			http.Error(w, "could not load photos", http.StatusInternalServerError)
		}

		// Temporary — log paths to see what's in DB
		for _, p := range photos {
			log.Printf("photo path: %s", p.Path)
		}

		tmpl := template.Must(template.ParseFiles(
			"templates/base.html",
			"templates/photos.html",
		))
		tmpl.ExecuteTemplate(w, "base", photos)
	}
}

// The func handle two things, getting the form template on visit
//	and uploading the image
func UpdatePhoto(s store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		// When we visit browser -> get the form instead of
		// hitting the /upload endpoints
		switch r.Method {

		case http.MethodGet:
		// List available tags when uploading a photo with tags
		tags, err := s.ListTags()
		if err != nil {
			http.Error(w, "could not load tags", http.StatusInternalServerError)
			return
		}
			tmpl := template.Must(template.ParseFiles(
				"templates/base.html",
				"templates/photo_upload.html",
			))
			tmpl.ExecuteTemplate(w, "base", tags)


			// In case of /upload hit the upload endpoints
		case http.MethodPost:
			// Parse a request body as -> form-data
			r.ParseMultipartForm(10 << 20)

			file, header, err := r.FormFile("photo")
			if err != nil {
				http.Error(w, "could not read file", http.StatusBadRequest)
				return
			}
			defer file.Close()

			if err := os.MkdirAll("photos", 0755); err != nil {
				http.Error(w, "could not create photos dir", http.StatusInternalServerError)
				return
			}

			filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), header.Filename)
			//Change save path to existing assets/images folder
			savePath := filepath.Join("photos", filename)

			destination, err := os.Create(savePath)
			if err != nil {
				http.Error(w, "could not save file", http.StatusInternalServerError)
				return
			}
			defer destination.Close()

			if _, err := io.Copy(destination, file); err != nil {
				http.Error(w, "could not write to file", http.StatusInternalServerError)
				return
			}

			photo := &model.Photo{
				Filename: header.Filename,
				Path:     savePath,
				Caption:  r.FormValue("caption"),
			}

			if err := s.SavePhoto(photo); err != nil {
				http.Error(w, "could not save to database", http.StatusInternalServerError)
				return
			}

			saveTags(s, photo.ID, r.FormValue("tags"))

			http.Redirect(w, r, "/photos/view", http.StatusSeeOther)

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func saveTags(s store.Store, photoID int64, tagsValue string) {
	if tagsValue == "" {
		return
	}

	// In case we pass in a list tags
	for _, tagName := range strings.Fields(tagsValue) {
		tagsID, err := s.SaveTag(tagName)

		if err != nil {
			log.Printf("could not save tag %s: %v", tagName, err)
			continue
		}
		s.AddTagToPhoto(photoID, tagsID)
	}
}

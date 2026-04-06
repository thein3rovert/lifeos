package handler

import (
	"html/template"
	"net/http"

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
func ListPhotos(s store.SQLiteStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		photos, err := s.ListPhotos()
		if err != nil {
			http.Error(w, "could not load photos", http.StatusInternalServerError)
		}

		tmpl := template.Must(template.ParseFiles(
			"templates/base.html",
			"templates/photos.html",
		))
		tmpl.ExecuteTemplate(w, "base", photos)
	}
}

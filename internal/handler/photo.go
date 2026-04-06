package handler

import (
	"fmt"
	"html/template"
	"io"
	"net/http"
	"os"
	"path/filepath"
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

		tmpl := template.Must(template.ParseFiles(
			"templates/base.html",
			"templates/photos.html",
		))
		tmpl.ExecuteTemplate(w, "base", photos)
	}
}


func UpdatePhoto(s store.Store) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request) {
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

		photo := &model.Photo {
			Filename: header.Filename,
			Path: 		savePath,
			Caption:  r.FormValue("caption"),
		}

		if err := s.SavePhoto(photo); err != nil {
			http.Error(w, "could not save to database", http.StatusInternalServerError)
			return
		}
		http.Redirect(w, r, "/photos", http.StatusSeeOther)
	}
}

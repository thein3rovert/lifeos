package handler

import (
	"html/template"
	"net/http"
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

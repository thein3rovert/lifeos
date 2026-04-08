package handler

import (
	"html/template"
	"net/http"
)

func Home(w http.ResponseWriter, r *http.Request) {
	// w.Write([]byte("skills page"))

	// Integrate template
	tmpl := template.Must(template.ParseFiles(
		"templates/base.html",
		"templates/home.html",
	))
	tmpl.ExecuteTemplate(w, "base", nil)
}

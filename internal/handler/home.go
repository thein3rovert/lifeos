package handler

import (
	"html/template"
	"net/http"
)

func Home(w http.ResponseWriter, r *http.Request) {
	// Check if it's an HTMX request
	isHTMX := r.Header.Get("HX-Request") == "true"

	if isHTMX {
		// Return only the content block for HTMX
		tmpl := template.Must(template.ParseFiles("templates/home.html"))
		tmpl.ExecuteTemplate(w, "content", nil)
		return
	}

	// Return full page for regular requests
	tmpl := template.Must(template.ParseFiles(
		"templates/base.html",
		"templates/home.html",
	))
	tmpl.ExecuteTemplate(w, "base", nil)
}

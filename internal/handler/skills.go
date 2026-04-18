package handler

import (
	"html/template"
	"net/http"

	"github.com/thein3rovert/lifeos/internal/store"
)

func Skills(w http.ResponseWriter, r *http.Request) {
	// w.Write([]byte("skills page"))

	// Integrate template
	tmpl := template.Must(template.ParseFiles(
		"templates/base.html",
		"templates/skills.html",
	))
	tmpl.ExecuteTemplate(w, "base", nil)
}


// ListSkills retuern a handler that lists all skills
func ListSkills(s store.SkillStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		skills, err := s.ListSkills()
		if err != nil {
			http.Error(w, "could not load skills", http.StatusInternalServerError)
			return
		}

		tmpl := template.Must(template.ParseFiles(
			"templates/base.html",
			"templates/skills.html",
		))
		tmpl.ExecuteTemplate(w, "base", skills)
	}
}

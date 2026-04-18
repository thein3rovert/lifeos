package handler

import (
	"bytes"
	"html/template"
	"net/http"

	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/yuin/goldmark"
)

// TODO: Mocw to a dedicated page later
type SkillViewData struct {
	ID 		string
	Title string
	Format string
	Content string
	HTMLContent string
	UpdatedAt string
}


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

func GetSkill(s store.SkillStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		//Extract skills ID from the url path
		skillExtractedId := r.URL.Path[len("/skills/"):]
		if skillExtractedId == "" {
			http.Error(w, "skill not found", http.StatusNotFound)
			return
			}

			//Get Skill
			skill, err := s.GetSkill(skillExtractedId)
			if err != nil {
				http.Error(w, "could not load skills", http.StatusInternalServerError)
				return
			}

			// Convert the get markdown to html using bytes for conversion
			// and goldmark for rendering
			var buf bytes.Buffer
			if err := goldmark.Convert([]byte(skill.Content), &buf); err != nil {
				// If conversion fails, use raw content
				buf.WriteString(skill.Content)
			}

			data := SkillViewData {
				ID: skill.ID,
				Title: skill.Title,
				Format: skill.Format,
				Content: skill.Content,
				HTMLContent: buf.String(),
				UpdatedAt: skill.UpdatedAt.String(),
			}

			tmpl := template.Must(template.ParseFiles(
				"templates/base.html",
				"templates/skill.html",
			))
			tmpl.ExecuteTemplate(w, "base", data)
	}
}

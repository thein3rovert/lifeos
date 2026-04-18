package handler

import (
	"bytes"
	"html/template"
	"net/http"
	"strings"

	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/yuin/goldmark"
)

// TODO: Mocw to a dedicated page later
type SkillViewData struct {
	ID 		string
	Title string
	Format string
	Content string
	HTMLContent template.HTML // Change so go doesnt escape it
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
		// Extract skill ID from the url path
		skillExtractedId := r.URL.Path[len("/skills/"):]
		if skillExtractedId == "" {
			http.Error(w, "skill not found", http.StatusNotFound)
			return
		}

		// Get Skill
		skill, err := s.GetSkill(skillExtractedId)
		if err != nil {
			http.Error(w, "could not load skill", http.StatusInternalServerError)
			return
		}

		// Strip frontmatter and get only markdown content
		markdownContent := stripMarkdownFrontMatter(skill.Content)

		// Convert markdown to HTML
		var buf bytes.Buffer
		if err := goldmark.Convert([]byte(markdownContent), &buf); err != nil {
			buf.WriteString(markdownContent)
		}

		data := SkillViewData{
			ID:          skill.ID,
			Title:       skill.Title,
			Format:      skill.Format,
			Content:     skill.Content,
			HTMLContent: template.HTML(buf.String()),
			UpdatedAt:   skill.UpdatedAt.String(),
		}

		tmpl := template.Must(template.ParseFiles(
			"templates/base.html",
			"templates/skill.html",
		))
		tmpl.ExecuteTemplate(w, "base", data)
	}
}

// TODO: Add to util
// Remove everything btw the first two formatter "---" leaving the actual
// markdown content
func stripMarkdownFrontMatter(content string) string {
	if !strings.HasPrefix(content, "---") {
		return content
	}

	lines := strings.Split(content, "\n")
	inFrontmatter := true
	var result []string

	for i, line := range lines {
		if i == 0 && line == "---" {
			continue
		}

	if inFrontmatter && line == "---" {
		inFrontmatter = false
		continue
	}
	if !inFrontmatter {
		result = append(result, line)
	}
	}
	return strings.Join(result, "\n")
}

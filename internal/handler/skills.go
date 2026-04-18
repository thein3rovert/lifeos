package handler

import (
	"bytes"
	"html/template"
	"log"
	"net/http"
	"strings"

	"github.com/thein3rovert/lifeos/internal/model"
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
	Notes       []model.Note // Buffer notes for this skill
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


// When we get skill we want to get the note also alongside from the notestore
func GetSkill(skillStore store.SkillStore, noteStore store.NoteStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract skill ID from the url path
		skillExtractedId := r.URL.Path[len("/skills/"):]
		if skillExtractedId == "" {
			http.Error(w, "skill not found", http.StatusNotFound)
			return
		}

		// Get Skill by skill id (name)
		skill, err := skillStore.GetSkill(skillExtractedId)
		if err != nil {
			http.Error(w, "could not load skill", http.StatusInternalServerError)
			return
		}

		// Get notes for this skill using skill id -> (noteid)
		notes, err := noteStore.GetNotesBySkill(skillExtractedId)
		if err != nil {
			// TODO: Log but don't fail - skill page should still show
			notes = []model.Note{}
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
			Notes:       notes,
		}

		tmpl := template.Must(template.ParseFiles(
			"templates/base.html",
			"templates/skill.html",
		))
		tmpl.ExecuteTemplate(w, "base", data)
	}
}

// SyncSkills forces a refresh of skills from GitHub
func SyncSkills(s store.SkillStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := s.Sync(); err != nil {
			http.Error(w, "Failed to sync skills: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Redirect back to skills list
		http.Redirect(w, r, "/skills", http.StatusSeeOther)
	}
}

// AddNote handles adding a buffer note to a skill
func AddNote(noteStore store.NoteStore) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }
        // Show form with two values
        skillID := r.FormValue("skill_id")
        content := r.FormValue("content")

        if skillID == "" || content == "" {
            http.Error(w, "Missing skill_id or content", http.StatusBadRequest)
            return
        }

        if err := noteStore.AddNote(skillID, content); err != nil {
            http.Error(w, "Failed to add note", http.StatusInternalServerError)
            return
        }
        // Redirect back to skill page
        http.Redirect(w, r, "/skills/"+skillID, http.StatusSeeOther)
    }
}

// AppendNotesToSkill appends all buffer notes to the skill content
// Since all skills are fetched from github..we need to create a pr for
// the append or send the note to ai to update the skillks and then create
// pr
func AppendNotesToSkill(skillStore store.SkillStore, noteStore store.NoteStore) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }
        skillID := r.FormValue("skill_id")
        if skillID == "" {
            http.Error(w, "Missing skill_id", http.StatusBadRequest)
            return
        }
        // Get all notes for this skill
        notes, err := noteStore.GetNotesBySkill(skillID)
        if err != nil {
            http.Error(w, "Failed to get notes", http.StatusInternalServerError)
            return
        }
        if len(notes) == 0 {
            // No notes to append, just redirect
            http.Redirect(w, r, "/skills/"+skillID, http.StatusSeeOther)
            return
        }
        // Get current skill
        skill, err := skillStore.GetSkill(skillID)
        if err != nil {
            http.Error(w, "Failed to get skill", http.StatusInternalServerError)
            return
        }

        // TODO: Move note builder to utils
        // Build notes content to append
        var notesBuilder strings.Builder
        notesBuilder.WriteString("\n\n## Notes\n\n")
        for _, note := range notes {
            notesBuilder.WriteString(note.Content)
            notesBuilder.WriteString("\n\n")
        }

        // Append to skill content
        // Add note builder content to skills
        skill.Content = skill.Content + notesBuilder.String()

        // Save skill (this should create a PR or update local file)
        // For now, we'll save locally if it's a local skill
        // TODO: Implement PR creation for GitHub skills
        if err := skillStore.SaveSkill(skill); err != nil {
            http.Error(w, "Failed to save skill: "+err.Error(), http.StatusInternalServerError)
            return
        }

        // Clear the buffer notes
        if err := noteStore.ClearNotes(skillID); err != nil {
            // Log error but don't fail - skill was already updated
            log.Printf("Warning: failed to clear notes for skill %s: %v", skillID, err)
        }
        // Redirect back to skill page
        http.Redirect(w, r, "/skills/"+skillID, http.StatusSeeOther)
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

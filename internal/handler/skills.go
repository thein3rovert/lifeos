package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/yuin/goldmark"
)

// TODO: Mocw to a dedicated page later
type SkillViewData struct {
	ID          string
	Title       string
	Format      string
	Content     string
	HTMLContent template.HTML // Change so go doesnt escape it
	Notes       []model.Note  // Buffer notes for this skill
	UpdatedAt   string
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

// DeleteNote removes a single buffer note
func DeleteNote(noteStore store.NoteStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		noteIDStr := r.FormValue("note_id")
		skillID := r.FormValue("skill_id")

		if noteIDStr == "" || skillID == "" {
			http.Error(w, "Missing note_id or skill_id", http.StatusBadRequest)
			return
		}
		noteID, err := strconv.Atoi(noteIDStr)
		if err != nil {
			http.Error(w, "Invalid note_id", http.StatusBadRequest)
			return
		}
		if err := noteStore.DeleteNote(noteID); err != nil {
			http.Error(w, "Failed to delete note", http.StatusInternalServerError)
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
		// Join all note into one string
		var notesBuilder strings.Builder
		for i, note := range notes {
			if i > 0 {
				notesBuilder.WriteString("\n\n")
			}
			notesBuilder.WriteString(note.Content)
		}
		newNotes := notesBuilder.String()

		// Call sidecar to get AI-updated skills
		// TODO: Move to Utilss
		var skillContent = skill.Content
		updatedContent, err := callSideCarForSkillUpdate(skillContent, newNotes)

		// Add note builder content to skills by updating skills with AI-generated
		// content
		skill.Content = updatedContent

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

func callSideCarForSkillUpdate(existingSkill, newNotes string) (string, error) {
	// TODO: Move type to appropraite or dedicated location
	type sidecarRequest struct {
		ExistingSkill string `json:"existingSkill"`
		NewNotes      string `json:"newNotes"`
	}
	type sidecarResponse struct {
		UpdatedSkill string `json:"updatedSkill"`
		Error        string `json:"error"`
	}
	payload := sidecarRequest{
		ExistingSkill: existingSkill,
		NewNotes:      newNotes,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	response, err := http.Post(
		"http://localhost:3001/skill/update",
		"application/json",
		bytes.NewBuffer(jsonData),
	)

	if err != nil {
		return "", err
	}

	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(response.Body)
		return "", fmt.Errorf("sidecar return  %d: %s", response.StatusCode, string(body))
	}

	var result sidecarResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return "", err
	}
	if result.Error != "" {
		return "", fmt.Errorf("sidecar error: %s", result.Error)
	}
	return result.UpdatedSkill, nil
}

// PreviewSkillUpdate calls sidecar to get AI-updated skill, shows preview
func PreviewSkillUpdate(skillStore store.SkillStore, noteStore store.NoteStore) http.HandlerFunc {
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
			http.Redirect(w, r, "/skills/"+skillID, http.StatusSeeOther)
			return
		}

		// Get current skill
		skill, err := skillStore.GetSkill(skillID)
		if err != nil {
			http.Error(w, "Failed to get skill", http.StatusInternalServerError)
			return
		}

		// Join all notes into one string
		var notesBuilder strings.Builder
		for i, note := range notes {
			if i > 0 {
				notesBuilder.WriteString("\n\n")
			}
			notesBuilder.WriteString(note.Content)
		}
		newNotes := notesBuilder.String()

		// Call sidecar to get AI-updated skill
		updatedContent, err := callSideCarForSkillUpdate(skill.Content, newNotes)
		if err != nil {
			log.Printf("Sidecar error: %v", err)
			http.Error(w, "Failed to update skill with AI: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Render preview page
		markdownContent := stripMarkdownFrontMatter(updatedContent)

		// Convert markdown to HTML
		var buf bytes.Buffer
		if err := goldmark.Convert([]byte(markdownContent), &buf); err != nil {
			buf.WriteString(markdownContent)
		}

		data := struct {
			ID              string
			Title           string
			Format          string
			OriginalContent string
			UpdatedContent  string
			HTMLContent     template.HTML
			Notes           []model.Note
		}{
			ID:              skill.ID,
			Title:           skill.Title,
			Format:          skill.Format,
			OriginalContent: skill.Content,
			UpdatedContent:  updatedContent,
			HTMLContent:     template.HTML(buf.String()),
			Notes:           notes,
		}

		tmpl := template.Must(template.ParseFiles(
			"templates/base.html",
			"templates/skill-preview.html",
		))
		tmpl.ExecuteTemplate(w, "base", data)
	}
}

// SaveSkillUpdate saves the AI-updated skill to GitHub and clears notes
func SaveSkillUpdate(skillStore store.SkillStore, noteStore store.NoteStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		skillID := r.FormValue("skill_id")
		updatedContent := r.FormValue("updated_content")

		if skillID == "" || updatedContent == "" {
			http.Error(w, "Missing skill_id or updated_content", http.StatusBadRequest)
			return
		}

		// Get current skill to preserve metadata
		skill, err := skillStore.GetSkill(skillID)
		if err != nil {
			http.Error(w, "Failed to get skill", http.StatusInternalServerError)
			return
		}

		// Update with AI-generated content
		skill.Content = updatedContent

		// Save skill (creates PR for GitHub skills)
		if err := skillStore.SaveSkill(skill); err != nil {
			http.Error(w, "Failed to save skill: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// Clear the buffer notes
		if err := noteStore.ClearNotes(skillID); err != nil {
			log.Printf("Warning: failed to clear notes for skill %s: %v", skillID, err)
		}

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

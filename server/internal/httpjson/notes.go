package httpjson

import "github.com/thein3rovert/lifeos/server/internal/model"

// NoteResponse is the JSON shape for a skill note.
type NoteResponse struct {
	ID        int     `json:"id"`
	SkillID   string  `json:"skill_id"`
	Title     string  `json:"title"`
	Content   string  `json:"content"`
	Type      string  `json:"type"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt *string `json:"updated_at,omitempty"`
}

// NoteToResponse converts a model.Note into its JSON response shape.
func NoteToResponse(n *model.Note) NoteResponse {
	var updatedAt *string
	if n.UpdatedAt != nil {
		updatedAtStr := n.UpdatedAt.String()
		updatedAt = &updatedAtStr
	}
	return NoteResponse{
		ID:        n.ID,
		SkillID:   n.SkillID,
		Title:     n.Title,
		Content:   n.Content,
		Type:      n.Type,
		CreatedAt: n.CreatedAt.String(),
		UpdatedAt: updatedAt,
	}
}

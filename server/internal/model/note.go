package model

import "time"

type Note struct {
	ID        int        `json:"id"`
	SkillID   string     `json:"skill_id"`
	Title     string     `json:"title"`
	Content   string     `json:"content"`
	Type      string     `json:"type"` // "manual" or "ai-generated"
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}

package model

import "time"

// ChatMessage is one message in a per-skill chat session (persisted in
// the chat_messages table). Role is either "user" or "assistant".
type ChatMessage struct {
	ID        int       `json:"id"`
	SkillID   string    `json:"skill_id"`
	SessionID string    `json:"session_id"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

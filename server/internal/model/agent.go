package model

import "time"

const AgentConversationSource = "floating-chat"

type AgentConversation struct {
	ID                string    `json:"id"`
	Source            string    `json:"source"`
	Title             string    `json:"title"`
	OpenCodeSessionID string    `json:"-"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type AgentMessage struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	Role           string    `json:"role"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"createdAt"`
}

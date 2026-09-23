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
	ID             string                `json:"id"`
	ConversationID string                `json:"conversationId"`
	Role           string                `json:"role"`
	Content        string                `json:"content"`
	Contexts       []AgentMessageContext `json:"contexts,omitempty"`
	DeliveryMode   string                `json:"deliveryMode,omitempty"`
	DeliveryStatus string                `json:"deliveryStatus,omitempty"`
	DeliveryError  string                `json:"deliveryError,omitempty"`
	Prompt         string                `json:"-"`
	CreatedAt      time.Time             `json:"createdAt"`
}

type AgentMessageContext struct {
	Kind      string `json:"kind"`
	PanelType string `json:"panelType"`
	ItemID    string `json:"itemId,omitempty"`
	Label     string `json:"label"`
}

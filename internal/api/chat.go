package api

import (
	"fmt"
	"net/http"
	"time"

	service "github.com/thein3rovert/lifeos/internal/services"
)

// ChatHandler handles persistent chat with OpenCode
type ChatHandler struct {
	chatService *service.ChatService
}

// NewChatHandler creates a new chat handler
func NewChatHandler(chatService *service.ChatService) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
	}
}

// Helper to get skill from request path and handle errors
func getSkillID(w http.ResponseWriter, r *http.Request) (string, bool) {
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return "", false
	}
	return skillID, true
}

type GetOrCreateSessionRequest struct {
	SkillID    string `json:"skillId"`
	SkillTitle string `json:"skillTitle"`
	SessionID  string `json:"sessionId,omitempty"`
}

type GetOrCreateSessionResponse struct {
	SessionID string `json:"sessionId"`
}

// GetOrCreateSession gets or creates an OpenCode session for a skill
// POST /api/skills/{id}/session
func (h *ChatHandler) GetOrCreateSession(w http.ResponseWriter, r *http.Request) {
	skillID, ok := getSkillID(w, r)
	if !ok {
		return
	}

	sessionID, err := h.chatService.CreateOrResumeSession(skillID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to get session: %v", err))
		return
	}

	respondJSON(w, http.StatusOK, GetOrCreateSessionResponse{SessionID: sessionID})
}

type ChatMessageRequest struct {
	Message string `json:"message"`
}

type ChatMessageResponse struct {
	Response string `json:"response"`
}

// SendChatMessage sends a message to the skill's chat session
// POST /api/skills/{id}/chat
func (h *ChatHandler) SendChatMessage(w http.ResponseWriter, r *http.Request) {
	var req ChatMessageRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Message == "" {
		respondError(w, http.StatusBadRequest, "message is required")
		return
	}

	skillID, ok := getSkillID(w, r)
	if !ok {
		return
	}

	// Call the chat service to handle the businesss logic
	response, err := h.chatService.SendMessage(skillID, req.Message)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, ChatMessageResponse{Response: response})
}

type ChatMessage struct {
	ID      string `json:"id"`
	Role    string `json:"role"`
	Content string `json:"content"`
	Created string `json:"created"`
}

type GetMessagesResponse struct {
	Messages []ChatMessage `json:"messages"`
}

// GetChatMessages gets the chat history for a skill
// GET /api/skills/{id}/messages
func (h *ChatHandler) GetChatMessages(w http.ResponseWriter, r *http.Request) {

	skillID, ok := getSkillID(w, r)
	if !ok {
		return
	}
	messages, err := h.chatService.GetMessages(skillID)

	if err != nil {
		fmt.Printf("[GetChatMessages] Error: %v\n", err)
		respondError(w, http.StatusInternalServerError, "failed to get messages")
		return
	}

	// Transform to response format
	var resp []ChatMessage
	for _, msg := range messages {
		resp = append(resp, ChatMessage{
			ID:      fmt.Sprintf("%d", msg.ID),
			Role:    msg.Role,
			Content: msg.Content,
			Created: msg.CreatedAt.Format(time.RFC3339),
		})
	}

	respondJSON(w, http.StatusOK, GetMessagesResponse{Messages: resp})
}

package chats

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/api"
	service "github.com/thein3rovert/lifeos/server/internal/services"
)

// ChatHandler handles persistent chat with OpenCode
type SkillChatHandler struct {
	agentChatService *service.AgentChatService
}

// NewAgentChatHandler creates a new chat handler
func NewSkillChatHandler(agentChatService *service.AgentChatService) *SkillChatHandler {
	return &SkillChatHandler{
		agentChatService: agentChatService,
	}
}

// Helper to get skill from request path and handle errors
func getSkillID(w http.ResponseWriter, r *http.Request) (string, bool) {
	skillID := r.PathValue("id")
	if skillID == "" {
		api.RespondError(w, http.StatusBadRequest, "skill ID is required")
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
func (h *SkillChatHandler) GetOrCreateSession(w http.ResponseWriter, r *http.Request) {
	skillID, ok := getSkillID(w, r)
	if !ok {
		return
	}

	sessionID, err := h.agentChatService.CreateOrResumeSession(skillID)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to get session: %v", err))
		return
	}

	api.RespondJSON(w, http.StatusOK, GetOrCreateSessionResponse{SessionID: sessionID})
}

type ChatMessageRequest struct {
	Message string `json:"message"`
	NoteIds []int  `json:"noteIds,omitempty"` // optional note IDs for context
}

type ChatMessageResponse struct {
	Response string `json:"response"`
}

// SendChatMessage sends a message to the skill's chat session
// POST /api/skills/{id}/chat
func (h *SkillChatHandler) SendChatMessage(w http.ResponseWriter, r *http.Request) {
	var req ChatMessageRequest
	if err := api.DecodeJSON(r, &req); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Message == "" {
		api.RespondError(w, http.StatusBadRequest, "message is required")
		return
	}

	skillID, ok := getSkillID(w, r)
	if !ok {
		return
	}

	// Call the chat service to handle the business logic
	response, err := h.agentChatService.SendSkillChatMessage(skillID, req.Message, req.NoteIds)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusOK, ChatMessageResponse{Response: response})
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
func (h *SkillChatHandler) GetChatMessages(w http.ResponseWriter, r *http.Request) {

	skillID, ok := getSkillID(w, r)
	if !ok {
		return
	}
	messages, err := h.agentChatService.GetSkillChatMessages(skillID)

	if err != nil {
		log.Printf("[GetChatMessages] Error: %v", err)
		api.RespondError(w, http.StatusInternalServerError, "failed to get messages")

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

	api.RespondJSON(w, http.StatusOK, GetMessagesResponse{Messages: resp})
}

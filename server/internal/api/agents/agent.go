package agents

import (
	"errors"
	"net/http"

	"github.com/thein3rovert/lifeos/server/internal/api"
	"github.com/thein3rovert/lifeos/server/internal/model"
	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

// AgentChatHandler handles the general-purpose agent chat endpoints
// (as opposed to per-skill chat sessions, which live in api/chats).
type AgentChatHandler struct {
	agentChatService *service.AgentChatService
}

// NewAgentChatHandler creates a new agent chat handler.
func NewAgentChatHandler(
	agentChatService *service.AgentChatService,
) *AgentChatHandler {
	return &AgentChatHandler{
		agentChatService: agentChatService,
	}
}

// AgentChatMessage sends/proxies a chat message to the sidecar's /agent/chat.
// POST /api/agent/chat
func (h *AgentChatHandler) AgentChatMessage(w http.ResponseWriter, r *http.Request) {
	var req service.AgentChatRequest

	if err := api.DecodeJSON(r, &req); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Message == "" {
		api.RespondError(w, http.StatusBadRequest, "message is required")
		return
	}

	chatResp, err := h.agentChatService.SendAgentChatMessage(req)
	if err != nil {
		if err.Error() == "message is required" {
			api.RespondError(w, http.StatusBadRequest, err.Error())
			return
		}
		api.RespondError(w, http.StatusBadGateway, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusOK, chatResp)
}

// AbortRequest aborts a running agent request.
// POST /api/agent/abort
func (h *AgentChatHandler) AbortRequest(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RequestID string `json:"requestId"`
	}

	if err := api.DecodeJSON(r, &req); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RequestID == "" {
		api.RespondError(w, http.StatusBadRequest, "requestId is required")
		return
	}

	if err := h.agentChatService.AbortAgentRequest(req.RequestID); err != nil {
		api.RespondError(w, http.StatusBadGateway, err.Error())
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"aborted":   true,
		"requestId": req.RequestID,
	})
}

// CreateConversation creates a persistent LifeOS  conversation.
func (h *AgentChatHandler) CreateConversation(w http.ResponseWriter, _ *http.Request) {
	conversation, err := h.agentChatService.CreateConversation()
	if err != nil {
		api.RespondError(w, http.StatusBadGateway, err.Error())
		return
	}
	api.RespondJSON(w, http.StatusCreated, map[string]any{"conversation": conversation})
}

// ListConversations lists all existing chat history.
func (h *AgentChatHandler) ListConversations(w http.ResponseWriter, _ *http.Request) {
	conversations, err := h.agentChatService.ListConversations()
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if conversations == nil {
		conversations = []model.AgentConversation{}
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{"conversations": conversations})
}

// GetConversation returns one floating-chat conversation and its messages.
func (h *AgentChatHandler) GetConversation(w http.ResponseWriter, r *http.Request) {
	conversation, messages, err := h.agentChatService.GetConversation(r.PathValue("conversationId"))
	if err != nil {
		respondFloatingChatError(w, err)
		return
	}
	if messages == nil {
		messages = []model.AgentMessage{}
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{
		"conversation": conversation,
		"messages":     messages,
	})
}

// SendConversationMessage sends and persists a message in a floating-chat conversation.
func (h *AgentChatHandler) SendConversationMessage(w http.ResponseWriter, r *http.Request) {
	var input service.SendAgentMessageInput
	if err := api.DecodeJSON(r, &input); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	conversationID := r.PathValue("conversationId")
	message, err := h.agentChatService.SendMessage(conversationID, input)
	if err != nil {
		respondFloatingChatError(w, err)
		return
	}
	conversation, _, err := h.agentChatService.GetConversation(conversationID)
	if err != nil {
		respondFloatingChatError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{
		"conversation": conversation,
		"message":      message,
	})
}

func respondFloatingChatError(w http.ResponseWriter, err error) {
	var validationErr *service.ValidationError
	switch {
	case errors.As(err, &validationErr):
		api.RespondError(w, http.StatusBadRequest, validationErr.Error())
	case errors.Is(err, store.ErrAgentConversationNotFound):
		api.RespondError(w, http.StatusNotFound, "conversation not found")
	default:
		api.RespondError(w, http.StatusBadGateway, err.Error())
	}
}

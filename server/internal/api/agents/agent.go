package agents

import (
	"encoding/json"
	"errors"
	"io"
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

// StreamConversationActivity securely proxies activity for the conversation's
// private OpenCode session without exposing that session ID to the browser.
func (h *AgentChatHandler) StreamConversationActivity(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		api.RespondError(w, http.StatusInternalServerError, "streaming is not supported")
		return
	}
	stream, err := h.agentChatService.StreamConversationActivity(
		r.Context(), r.PathValue("conversationId"),
	)
	if err != nil {
		if errors.Is(err, store.ErrAgentConversationNotFound) {
			api.RespondError(w, http.StatusNotFound, "conversation not found")
		} else {
			// Do not return the upstream URL: it contains the private session ID.
			api.RespondError(w, http.StatusBadGateway, "activity stream unavailable")
		}
		return
	}
	defer stream.Close()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	buffer := make([]byte, 32*1024)
	for {
		n, readErr := stream.Read(buffer)
		if n > 0 {
			if _, writeErr := w.Write(buffer[:n]); writeErr != nil {
				return
			}
			flusher.Flush()
		}
		if readErr != nil {
			if !errors.Is(readErr, io.EOF) {
				return
			}
			return
		}
	}
}

func (h *AgentChatHandler) ListConversationInteractions(w http.ResponseWriter, r *http.Request) {
	interactions, err := h.agentChatService.ListConversationInteractions(r.PathValue("conversationId"))
	if err != nil {
		h.respondInteractionError(w, err)
		return
	}
	if interactions.Permissions == nil {
		interactions.Permissions = []json.RawMessage{}
	}
	if interactions.Forms == nil {
		interactions.Forms = []json.RawMessage{}
	}
	api.RespondJSON(w, http.StatusOK, interactions)
}

func (h *AgentChatHandler) GetConversationForm(w http.ResponseWriter, r *http.Request) {
	form, err := h.agentChatService.GetConversationForm(r.PathValue("conversationId"), r.PathValue("formId"))
	if err != nil {
		h.respondInteractionError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]any{"form": form})
}

func (h *AgentChatHandler) ReplyConversationPermission(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Decision string `json:"decision"`
		Message  string `json:"message"`
	}
	if api.DecodeJSON(r, &input) != nil || (input.Decision != "once" && input.Decision != "always" && input.Decision != "reject") {
		api.RespondError(w, http.StatusBadRequest, "decision must be once, always, or reject")
		return
	}
	if err := h.agentChatService.ReplyConversationPermission(r.PathValue("conversationId"), r.PathValue("requestId"), input.Decision, input.Message); err != nil {
		h.respondInteractionError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "settled", "decision": input.Decision})
}

func (h *AgentChatHandler) ReplyConversationForm(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Answer map[string]any `json:"answer"`
	}
	if api.DecodeJSON(r, &input) != nil || input.Answer == nil {
		api.RespondError(w, http.StatusBadRequest, "answer is required")
		return
	}
	if err := h.agentChatService.ReplyConversationForm(r.PathValue("conversationId"), r.PathValue("formId"), input.Answer); err != nil {
		h.respondInteractionError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "answered"})
}

func (h *AgentChatHandler) CancelConversationForm(w http.ResponseWriter, r *http.Request) {
	if err := h.agentChatService.CancelConversationForm(r.PathValue("conversationId"), r.PathValue("formId")); err != nil {
		h.respondInteractionError(w, err)
		return
	}
	api.RespondJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func (h *AgentChatHandler) respondInteractionError(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrAgentConversationNotFound) {
		api.RespondError(w, http.StatusNotFound, "conversation not found")
		return
	}
	// Never expose an upstream URL because it contains the private OpenCode session ID.
	api.RespondError(w, http.StatusBadGateway, "agent interaction unavailable")
}

// SendConversationMessage sends and persists a message in a floating-chat conversation.
func (h *AgentChatHandler) SendConversationMessage(w http.ResponseWriter, r *http.Request) {
	var input service.SendAgentMessageInput
	if err := api.DecodeJSON(r, &input); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	conversationID := r.PathValue("conversationId")
	userMessage, message, err := h.agentChatService.SendMessage(conversationID, input)
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
		"userMessage":  userMessage,
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

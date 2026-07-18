package agents

import (
	"net/http"

	"github.com/thein3rovert/lifeos/server/internal/api"
	service "github.com/thein3rovert/lifeos/server/internal/services"
)

// AgentChatHandler handles the general-purpose agent chat endpoints
// (as opposed to per-skill chat sessions, which live in api/chats).
type AgentChatHandler struct {
	agentChatService *service.AgentChatService
}

// NewAgentChatHandler creates a new agent chat handler.
func NewAgentChatHandler(agentChatService *service.AgentChatService) *AgentChatHandler {
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

package agents

import (
	"net/http"

	"github.com/thein3rovert/lifeos/internal/api"
	service "github.com/thein3rovert/lifeos/internal/services"
)

// AgentHandler proxies/send agent chat requests to the sidecar
// type AgentHandler struct {
// 	sidecarURL string
// }

// ChatHandler handles persistent chat with OpenCode
type AgentHandler struct {
	agentChatService *service.AgentChatService
}

// NewAgentChatHandler creates a new chat handler
func NewAgentChatHandler(agentChatService *service.AgentChatService) *AgentHandler {
	return &AgentHandler{
		agentChatService: agentChatService,
	}
}

// // NewAgentHandler creates a new agent handler
// func NewAgentHandler(sidecarURL string) *AgentHandler {
// 	return &AgentHandler{
// 		sidecarURL: sidecarURL,
// 	}
// }

// type AgentChatRequest struct {
// 	Message   string  `json:"message"`
// 	SessionID *string `json:"sessionId,omitempty"`
// }

// type AgentChatResponse struct {
// 	Response  string `json:"response"`
// 	SessionID string `json:"sessionId"`
// }

// Chat send/proxies chat messages to the sidecar's /agent/chat endpoint
// POST /api/agent/chat
func (h *AgentHandler) AgentChatMessage(w http.ResponseWriter, r *http.Request) {

	// Creater var req of type struct
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

// Events streams real-time agent events via SSE
// GET /api/agent/events
// func (h *AgentHandler) Events(w http.ResponseWriter, r *http.Request) {
// 	// Set SSE headers
// 	w.Header().Set("Content-Type", "text/event-stream")
// 	w.Header().Set("Cache-Control", "no-cache")
// 	w.Header().Set("Connection", "keep-alive")
// 	w.Header().Set("Access-Control-Allow-Origin", "*")

// 	// Stream events from sidecar
// 	resp, err := http.Get(fmt.Sprintf("%s/agent/events", h.sidecarURL))
// 	if err != nil {
// 		http.Error(w, fmt.Sprintf("Failed to connect to event stream: %v", err), http.StatusBadGateway)
// 		return
// 	}
// 	defer resp.Body.Close()

// 	// Forward SSE stream to client
// 	flusher, ok := w.(http.Flusher)
// 	if !ok {
// 		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
// 		return
// 	}

// 	buf := make([]byte, 4096)
// 	for {
// 		n, err := resp.Body.Read(buf)
// 		if n > 0 {
// 			w.Write(buf[:n])
// 			flusher.Flush()
// 		}
// 		if err != nil {
// 			break
// 		}
// 	}
// }

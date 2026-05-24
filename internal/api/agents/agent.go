package agents

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/thein3rovert/lifeos/internal/api"
)

// AgentHandler proxies/send agent chat requests to the sidecar
type AgentHandler struct {
	sidecarURL string
}

// NewAgentHandler creates a new agent handler
func NewAgentHandler(sidecarURL string) *AgentHandler {
	return &AgentHandler{
		sidecarURL: sidecarURL,
	}
}

type AgentChatRequest struct {
	Message   string  `json:"message"`
	SessionID *string `json:"sessionId,omitempty"`
}

type AgentChatResponse struct {
	Response  string `json:"response"`
	SessionID string `json:"sessionId"`
}

// Chat send/proxies chat messages to the sidecar's /agent/chat endpoint
// POST /api/agent/chat
func (h *AgentHandler) AgentChat(w http.ResponseWriter, r *http.Request) {

	// Creater var req of type struct
	var req AgentChatRequest

	if err := api.DecodeJSON(r, &req); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Message == "" {
		api.RespondError(w, http.StatusBadRequest, "message is required")
		return
	}

	// Forward request to sidecar
	body, err := json.Marshal(req)
	if err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to marshal request")
		return
	}

	// TODO: Make sure endpoint is usecase focused
	// ex. /agent/raven (Because we can have more than
	// one agent using this same func)
	resp, err := http.Post(
		fmt.Sprintf("%s/agent/chat", h.sidecarURL),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		api.RespondError(w, http.StatusBadGateway, fmt.Sprintf("sidecar request failed: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		api.RespondError(w, resp.StatusCode, fmt.Sprintf("sidecar error: %s", string(bodyBytes)))
		return
	}

	var chatResp AgentChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		api.RespondError(w, http.StatusInternalServerError, "failed to decode sidecar response")
		return
	}

	api.RespondJSON(w, http.StatusOK, chatResp)
}

// Events streams real-time agent events via SSE
// GET /api/agent/events
func (h *AgentHandler) Events(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Stream events from sidecar
	resp, err := http.Get(fmt.Sprintf("%s/agent/events", h.sidecarURL))
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to connect to event stream: %v", err), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Forward SSE stream to client
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	buf := make([]byte, 4096)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			w.Write(buf[:n])
			flusher.Flush()
		}
		if err != nil {
			break
		}
	}
}

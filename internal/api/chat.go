package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/thein3rovert/lifeos/internal/store"
)

// ChatHandler handles persistent chat with OpenCode
type ChatHandler struct {
	skillStore  *store.SQLSkillStore
	sidecarURL  string
}

// NewChatHandler creates a new chat handler
func NewChatHandler(skillStore *store.SQLSkillStore) *ChatHandler {
	sidecarURL := os.Getenv("SIDECAR_URL")
	if sidecarURL == "" {
		sidecarURL = "http://127.0.0.1:3002"
	}

	return &ChatHandler{
		skillStore: skillStore,
		sidecarURL: sidecarURL,
	}
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
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	// Get skill from database
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusNotFound, "skill not found")
		return
	}

	// Call sidecar to get/create session
	reqBody := GetOrCreateSessionRequest{
		SkillID:    skill.ID,
		SkillTitle: skill.Title,
		SessionID:  skill.OpenCodeSessionID,
	}

	sessionID, err := h.callSidecar("/session/getOrCreate", reqBody)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to get session: %v", err))
		return
	}

	// Save session ID if it's new
	if skill.OpenCodeSessionID != sessionID {
		if err := h.skillStore.SetSessionID(skill.ID, sessionID); err != nil {
			respondError(w, http.StatusInternalServerError, "failed to save session ID")
			return
		}
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
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	var req ChatMessageRequest
	if err := decodeJSON(r, &req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Message == "" {
		respondError(w, http.StatusBadRequest, "message is required")
		return
	}

	// Get skill from database
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusNotFound, "skill not found")
		return
	}

	// Ensure session exists
	if skill.OpenCodeSessionID == "" {
		respondError(w, http.StatusBadRequest, "no active session for this skill")
		return
	}

	// Call sidecar to send message
	sidecarReq := map[string]interface{}{
		"sessionId":    skill.OpenCodeSessionID,
		"message":      req.Message,
		"skillContent": skill.Content,
	}

	response, err := h.callSidecar("/session/chat", sidecarReq)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to send message: %v", err))
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
	skillID := r.PathValue("id")
	if skillID == "" {
		respondError(w, http.StatusBadRequest, "skill ID is required")
		return
	}

	// Get skill from database
	skill, err := h.skillStore.GetSkill(skillID)
	if err != nil {
		respondError(w, http.StatusNotFound, "skill not found")
		return
	}

	if skill.OpenCodeSessionID == "" {
		// No session yet, return empty messages
		respondJSON(w, http.StatusOK, GetMessagesResponse{Messages: []ChatMessage{}})
		return
	}

	// Call sidecar to get messages
	sidecarReq := map[string]string{
		"sessionId": skill.OpenCodeSessionID,
	}

	var messagesResp struct {
		Messages []ChatMessage `json:"messages"`
	}

	if err := h.callSidecarJSON("/session/messages", sidecarReq, &messagesResp); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("failed to get messages: %v", err))
		return
	}

	respondJSON(w, http.StatusOK, messagesResp)
}

// Helper to call sidecar and get string response
func (h *ChatHandler) callSidecar(endpoint string, body interface{}) (string, error) {
	var result map[string]interface{}
	if err := h.callSidecarJSON(endpoint, body, &result); err != nil {
		return "", err
	}

	// Extract first string value from response
	for _, v := range result {
		if str, ok := v.(string); ok {
			return str, nil
		}
	}

	return "", fmt.Errorf("no string response from sidecar")
}

// Helper to call sidecar and decode JSON response
func (h *ChatHandler) callSidecarJSON(endpoint string, body interface{}, response interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(
		h.sidecarURL+endpoint,
		"application/json",
		bytes.NewBuffer(jsonBody),
	)
	if err != nil {
		return fmt.Errorf("sidecar request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sidecar returned %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return json.NewDecoder(resp.Body).Decode(response)
}

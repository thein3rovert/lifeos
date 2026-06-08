package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/store"
	"github.com/thein3rovert/lifeos/internal/store/notes"
	"github.com/thein3rovert/lifeos/internal/store/skills"
)

// Move struct to a type folder
type AgentChatService struct {
	// Stores
	skillStore *skills.SQLSkillStore
	msgStore   *store.ChatMessageStore
	noteStore  *notes.NoteStore
	// Sidecar
	sidecarURL string
}

func NewAgentChatService(skillStore *skills.SQLSkillStore, msgStore *store.ChatMessageStore, noteStore *notes.NoteStore, sidecarURL string) *AgentChatService {
	return &AgentChatService{
		skillStore: skillStore,
		msgStore:   msgStore,
		noteStore:  noteStore,
		sidecarURL: sidecarURL,
	}
}

type AgentChatRequest struct {
	Message          string                `json:"message"`
	SessionID        *string               `json:"sessionId,omitempty"`
	StructuredOutput *StructuredOutputSpec `json:"structuredOutput,omitempty"`
	Context          string                `json:"context,omitempty"`
	RequestID        string                `json:"requestId,omitempty"`
}

// StructuredOutputSpec specifies structured output configuration for the sidecar
type StructuredOutputSpec struct {
	PanelType string `json:"panelType"`
}

type AgentChatResponse struct {
	Response  string `json:"response"`
	SessionID string `json:"sessionId"`
}

// CreateOrResumeSession creates a new OpenCode session or returns existing one
func (s *AgentChatService) CreateOrResumeSession(skillID string) (string, error) {
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return "", fmt.Errorf("skill not found: %w", err)
	}

	// If session already exists, return it
	if skill.OpenCodeSessionID != "" {
		return skill.OpenCodeSessionID, nil
	}

	// Create new session via sidecar
	reqBody := map[string]string{
		"skillId":    skillID,
		"skillTitle": skill.Title,
	}
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(s.sidecarURL+"/session/getOrCreate", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to call sidecar: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("sidecar returned status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	sessionID, ok := result["sessionId"].(string)
	if !ok {
		return "", fmt.Errorf("sessionId not found in response or invalid type")
	}

	// Save session ID to skill
	if err := s.skillStore.SetSessionID(skillID, sessionID); err != nil {
		return "", err
	}

	return sessionID, nil
}

func (s *AgentChatService) SendAgentChatMessage(req AgentChatRequest) (AgentChatResponse, error) {

	if req.Message == "" {
		return AgentChatResponse{}, fmt.Errorf("message is required")
	}

	// Forward request to sidecar
	body, err := json.Marshal(req)
	if err != nil {
		return AgentChatResponse{}, fmt.Errorf("failed to mershal request")
	}
	// TODO: Make sure endpoint is usecase focused
	// ex. /agent/raven (Because we can have more than
	// one agent using this same func)

	// Create HTTP client with 10-minute timeout for AI requests (matches sidecar)
	client := &http.Client{
		Timeout: 600 * time.Second,
	}

	resp, err := client.Post(
		fmt.Sprintf("%s/agent/chat", s.sidecarURL),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return AgentChatResponse{}, fmt.Errorf("sidecar request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return AgentChatResponse{}, fmt.Errorf("sidecar error: %s", string(bodyBytes))
	}

	var chatResp AgentChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {

		return AgentChatResponse{}, fmt.Errorf("failed to decode sidecar response: %w", err)
	}

	return chatResp, nil
}

// AbortAgentRequest aborts a running agent request via sidecar
func (s *AgentChatService) AbortAgentRequest(requestID string) error {
	if requestID == "" {
		return fmt.Errorf("requestId is required")
	}

	// Forward abort request to sidecar
	reqBody := map[string]string{
		"requestId": requestID,
	}
	body, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal abort request: %w", err)
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Post(
		fmt.Sprintf("%s/agent/abort", s.sidecarURL),
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("sidecar abort request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sidecar abort error: %s", string(bodyBytes))
	}

	return nil
}

// SendMessage handles sending a chat message and saving it
// noteIds is optional - if provided, note contents will be prepended as context
func (s *AgentChatService) SendSkillChatMessage(skillID, message string, noteIds []int) (string, error) {
	// Get the skill
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return "", fmt.Errorf("skill not found: %w", err)
	}

	// Check if session exists
	if skill.OpenCodeSessionID == "" {
		return "", fmt.Errorf("no active session for skill")
	}

	// Prepend note contents if noteIds are provided
	finalMessage := message
	if len(noteIds) > 0 {
		notes, err := s.noteStore.GetNotesBySkill(skillID)
		if err == nil {
			var contextParts []string
			for _, noteID := range noteIds {
				for _, note := range notes {
					if note.ID == noteID {
						contextParts = append(contextParts, fmt.Sprintf("[Note: %s]\n%s", note.Title, note.Content))
						break
					}
				}
			}
			if len(contextParts) > 0 {
				finalMessage = fmt.Sprintf("[Context from %d note(s)]\n\n%s\n\n---\n\n%s", len(contextParts), strings.Join(contextParts, "\n\n"), message)
			}
		}
	}

	// Build request body
	reqBody := map[string]interface{}{
		"sessionId":    skill.OpenCodeSessionID,
		"message":      finalMessage,
		"skillContent": skill.Content,
	}

	// Call sidecar to send message
	response, err := s.callSidecar("/session/chat", reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to call sidecar: %w", err)
	}

	// Save user message (original, not with context)
	if err := s.msgStore.SaveChatMessage(skillID, skill.OpenCodeSessionID, "user", message); err != nil {
		fmt.Printf("Warning: failed to save user message: %v\n", err)
	}

	// Save assistant response
	if err := s.msgStore.SaveChatMessage(skillID, skill.OpenCodeSessionID, "assistant", response); err != nil {
		fmt.Printf("Warning: failed to save assistant message: %v\n", err)
	}

	return response, nil
}

// GetMessages retrieves all messages for a skill's session
func (s *AgentChatService) GetSkillChatMessages(skillID string) ([]store.ChatMessage, error) {
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}

	return s.msgStore.GetChatMessages(skillID, skill.OpenCodeSessionID)
}

// ============== HELPERS ==================

func (s *AgentChatService) callSidecar(endpoint string, body interface{}) (string, error) {
	var result map[string]interface{}
	if err := s.callSidecarJSON(endpoint, body, &result); err != nil {
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
func (s *AgentChatService) callSidecarJSON(endpoint string, body interface{}, response interface{}) error {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(
		s.sidecarURL+endpoint,
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

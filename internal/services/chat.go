package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/thein3rovert/lifeos/internal/store"
)

type ChatService struct {
	skillStore *store.SQLSkillStore
	msgStore   *store.ChatMessageStore
	sidecarURL string
}

func NewChatService(skillStore *store.SQLSkillStore, msgStore *store.ChatMessageStore, sidecarURL string) *ChatService {
	return &ChatService{
		skillStore: skillStore,
		msgStore:   msgStore,
		sidecarURL: sidecarURL,
	}
}

// SendMessage handles sending a chat message and saving it
func (s *ChatService) SendMessage(skillID, message string) (string, error) {
	// Get the skill
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return "", fmt.Errorf("skill not found: %w", err)
	}

	// Check if session exists
	if skill.OpenCodeSessionID == "" {
		return "", fmt.Errorf("no active session for skill")
	}

	// Build request body
	reqBody := map[string]interface{}{
		"sessionId":    skill.OpenCodeSessionID,
		"message":      message,
		"skillContent": skill.Content,
	}

	// Call sidecar to send message
	response, err := s.callSidecar("/session/chat", reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to call sidecar: %w", err)
	}

	// Save user message
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
func (s *ChatService) GetMessages(skillID string) ([]store.ChatMessage, error) {
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}

	return s.msgStore.GetChatMessages(skillID, skill.OpenCodeSessionID)
}

// CreateOrResumeSession creates a new OpenCode session or returns existing one
func (s *ChatService) CreateOrResumeSession(skillID string) (string, error) {
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return "", fmt.Errorf("skill not found: %w", err)
	}

	// If session already exists, return it
	if skill.OpenCodeSessionID != "" {
		return skill.OpenCodeSessionID, nil
	}

	// Create new session via sidecar
	reqBody := map[string]string{"skillId": skillID}
	jsonData, _ := json.Marshal(reqBody)

	resp, err := http.Post(s.sidecarURL+"/session/create", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(body, &result)

	sessionID := result["sessionId"].(string)

	// Save session ID to skill
	if err := s.skillStore.SetSessionID(skillID, sessionID); err != nil {
		return "", err
	}

	return sessionID, nil
}

// ============== HELPERS ==================

func (s *ChatService) callSidecar(endpoint string, body interface{}) (string, error) {
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
func (s *ChatService) callSidecarJSON(endpoint string, body interface{}, response interface{}) error {
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

package service

import (
	"fmt"
	"log"
	"strings"

	"github.com/thein3rovert/lifeos/server/internal/model"
	"github.com/thein3rovert/lifeos/server/internal/sidecar"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

// skillSessionStore is what AgentChatService needs from the skill store:
// the usual read methods plus per-skill session tracking.
type skillSessionStore interface {
	store.SkillStore
	store.SkillSessionStore
}

// AgentChatService orchestrates agent chat: session management, message
// persistence, and dispatch to the sidecar. All sidecar I/O goes through
// the injected sidecar.Client so this service stays transport-agnostic.
type AgentChatService struct {
	skillStore skillSessionStore
	msgStore   store.ChatMessageStore
	noteStore  store.NoteStore
	sidecar    *sidecar.Client
}

func NewAgentChatService(
	skillStore skillSessionStore,
	msgStore store.ChatMessageStore,
	noteStore store.NoteStore,
	sc *sidecar.Client,
) *AgentChatService {
	return &AgentChatService{
		skillStore: skillStore,
		msgStore:   msgStore,
		noteStore:  noteStore,
		sidecar:    sc,
	}
}

// ── Request/response types re-exported from sidecar for handler convenience ──
// These are aliases so handlers don't need to import the sidecar package
// directly if they only touch the service layer.

type AgentChatRequest = sidecar.AgentChatRequest
type AgentChatResponse = sidecar.AgentChatResponse
type StructuredOutputSpec = sidecar.StructuredOutputSpec

// CreateOrResumeSession creates a new OpenCode session or returns existing one.
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
	sessionID, err := s.sidecar.CreateOrResumeSession(skillID, skill.Title)
	if err != nil {
		return "", err
	}

	// Save session ID to skill
	if err := s.skillStore.SetSessionID(skillID, sessionID); err != nil {
		return "", err
	}
	return sessionID, nil
}

// SendAgentChatMessage forwards a chat request to the general agent endpoint.
func (s *AgentChatService) SendAgentChatMessage(req AgentChatRequest) (AgentChatResponse, error) {
	if req.Message == "" {
		return AgentChatResponse{}, fmt.Errorf("message is required")
	}
	return s.sidecar.SendAgentChat(req)
}

// AbortAgentRequest aborts a running agent request via sidecar.
func (s *AgentChatService) AbortAgentRequest(requestID string) error {
	return s.sidecar.AbortAgentRequest(requestID)
}

// SendSkillChatMessage sends a message inside a skill's chat session,
// optionally prepending note contents as context. Persists both sides.
func (s *AgentChatService) SendSkillChatMessage(skillID, message string, noteIds []int) (string, error) {
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return "", fmt.Errorf("skill not found: %w", err)
	}
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

	// Call sidecar
	response, err := s.sidecar.SendSessionChat(skill.OpenCodeSessionID, finalMessage, skill.Content)
	if err != nil {
		return "", fmt.Errorf("failed to call sidecar: %w", err)
	}

	// Save user message (original, not with context)
	if err := s.msgStore.SaveChatMessage(skillID, skill.OpenCodeSessionID, "user", message); err != nil {
		log.Printf("Warning: failed to save user message: %v", err)
	}
	// Save assistant response
	if err := s.msgStore.SaveChatMessage(skillID, skill.OpenCodeSessionID, "assistant", response); err != nil {
		log.Printf("Warning: failed to save assistant message: %v", err)
	}
	return response, nil
}

// GetSkillChatMessages retrieves all messages for a skill's session.
func (s *AgentChatService) GetSkillChatMessages(skillID string) ([]model.ChatMessage, error) {
	skill, err := s.skillStore.GetSkill(skillID)
	if err != nil {
		return nil, fmt.Errorf("skill not found: %w", err)
	}
	return s.msgStore.GetChatMessages(skillID, skill.OpenCodeSessionID)
}

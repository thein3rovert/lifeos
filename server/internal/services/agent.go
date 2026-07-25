package service

import (
	"fmt"
	"log"
	"strings"
	"time"

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
	skillStore      skillSessionStore
	msgStore        store.ChatMessageStore
	noteStore       store.NoteStore
	smartBoardStore store.SmartBoardStore
	sidecar         *sidecar.Client
}

func NewAgentChatService(
	skillStore skillSessionStore,
	msgStore store.ChatMessageStore,
	noteStore store.NoteStore,
	smartBoardStore store.SmartBoardStore,
	sc *sidecar.Client,
) *AgentChatService {
	return &AgentChatService{
		skillStore:      skillStore,
		msgStore:        msgStore,
		noteStore:       noteStore,
		smartBoardStore: smartBoardStore,
		sidecar:         sc,
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

// SendAgentChatMessage forwards a chat request to the general agent endpoint(use for flowating chat)
// prepending the latest smart board panels to Context so the agent can
// answer "what's blocking me" etc. without triggering fresh MCP file scans.
func (s *AgentChatService) SendAgentChatMessage(req AgentChatRequest) (AgentChatResponse, error) {
	if req.Message == "" {
		return AgentChatResponse{}, fmt.Errorf("message is required")
	}

	// Inject panel state(data) as extra context, this help to prevent
	// qureying the knowledge base (mcp) for every message, if some already
	// in context then use that
	// If no panel exist we skip
	if panels := s.latestPanelsContext(); panels != "" {
		if req.Context == "" {
			req.Context = panels
		} else {
			req.Context = panels + "\n---\n" + req.Context
		}
	}
	return s.sidecar.SendAgentChat(req)
}

// AbortAgentRequest aborts a running agent request via sidecar.
func (s *AgentChatService) AbortAgentRequest(requestID string) error {
	return s.sidecar.AbortAgentRequest(requestID)
}

// latestPanelsContext returns a plain-text summary of the four current smart
// board panels, ready to prepend to an agent request as extra Context.
// Best-effort: any missing/errored panel is silently skipped so a partial
// board still surfaces what it can.
func (s *AgentChatService) latestPanelsContext(days int) string {
	if s.smartBoardStore == nil {
		return ""
	}

	panelTypes := []string{
		"things-to-remember",
		"suggestions",
		"achievements",
		"blockers",
	}
	cutoff := time.Now().AddDate(0, 0, -days)

	var b strings.Builder
	fmt.Fprintf(&b, "### Smart Board (items from last %d days)\n", days)
	b.WriteString("(Cached - use these panels before scanning files)\n\n")

	found := 0
	for _, pt := range panelTypes {
		panel, err := s.smartBoardStore.GetLatestPanel(pt)
		if err != nil || panel == nil || panel.Data == "" {
			continue
		}

		// Parse as a generic list of item maps
		var items []map[string]any
		if err := json.Unmarshal([]byte(panel.Data), &items); err != nil {
			continue // skip panel if it isn't a list
		}

		recent := filterByDate(items, cutoff)
		if len(recent) == 0 {
			continue
		}

		trimmed, _ := json.Marshal(recent)
		fmt.Fprintf(&b, "**%s** (%d recent item(s)):\n%s\n\n", pt, len(recent), string(trimmed))
		found++
	}

	if found == 0 {
		return ""
	}
	return b.String()
}

// filterByDate keeps only items whose "date" field parses as YYYY-MM-DD and
// falls on/after cutoff. Items without a date are kept (better safe than sorry).
func filterByDate(items []map[string]any, cutoff time.Time) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		dateStr, ok := item["date"].(string)
		if !ok || dateStr == "" {
			out = append(out, item) // no date → keep
			continue
		}
		t, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			out = append(out, item) // unparseable → keep
			continue
		}
		if !t.Before(cutoff) {
			out = append(out, item)
		}
	}
	return out
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

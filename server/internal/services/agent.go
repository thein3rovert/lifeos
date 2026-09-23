package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
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
	skillStore        skillSessionStore
	msgStore          store.ChatMessageStore
	conversationStore store.AgentConversationStore
	noteStore         store.NoteStore
	smartBoardStore   store.SmartBoardStore
	sidecar           *sidecar.Client
}

func NewAgentChatService(
	skillStore skillSessionStore,
	msgStore store.ChatMessageStore,
	noteStore store.NoteStore,
	smartBoardStore store.SmartBoardStore,
	sc *sidecar.Client,
	conversationStore store.AgentConversationStore,
) *AgentChatService {
	return &AgentChatService{
		skillStore:        skillStore,
		msgStore:          msgStore,
		conversationStore: conversationStore,
		noteStore:         noteStore,
		smartBoardStore:   smartBoardStore,
		sidecar:           sc,
	}
}

const newAgentConversationTitle = "New conversation"

type SendAgentMessageInput struct {
	Message        string                      `json:"message"`
	RequestID      string                      `json:"requestId,omitempty"`
	MessageID      string                      `json:"messageId,omitempty"`
	RetryMessageID string                      `json:"retryMessageId,omitempty"`
	Delivery       string                      `json:"delivery,omitempty"`
	Contexts       []model.AgentMessageContext `json:"contexts,omitempty"`
}

func (s *AgentChatService) CreateConversation() (*model.AgentConversation, error) {
	sessionID, err := s.sidecar.CreateAgentSession("lifeos-floating-chat", s.latestPanelsContext(7))
	if err != nil {
		return nil, fmt.Errorf("create agent session: %w", err)
	}
	now := time.Now()
	conversation := &model.AgentConversation{
		ID: uuid.NewString(), Source: model.AgentConversationSource, Title: newAgentConversationTitle,
		OpenCodeSessionID: sessionID, CreatedAt: now, UpdatedAt: now,
	}
	if err := s.conversationStore.CreateConversation(conversation); err != nil {
		return nil, fmt.Errorf("create conversation: %w", err)
	}
	return conversation, nil
}

func (s *AgentChatService) ListConversations() ([]model.AgentConversation, error) {
	return s.conversationStore.ListConversations(model.AgentConversationSource)
}

func (s *AgentChatService) GetConversation(id string) (*model.AgentConversation, []model.AgentMessage, error) {
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return nil, nil, err
	}
	messages, err := s.conversationStore.ListMessages(id)
	return conversation, messages, err
}

// StreamConversationActivity resolves a public LifeOS conversation to its
// private OpenCode session and opens its activity stream.
func (s *AgentChatService) StreamConversationActivity(ctx context.Context, id string) (io.ReadCloser, error) {
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return nil, err
	}
	return s.sidecar.StreamAgentActivity(ctx, conversation.OpenCodeSessionID)
}

func (s *AgentChatService) ListConversationInteractions(id string) (sidecar.AgentInteractions, error) {
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return sidecar.AgentInteractions{}, err
	}
	return s.sidecar.ListAgentInteractions(conversation.OpenCodeSessionID)
}

func (s *AgentChatService) GetConversationForm(id, formID string) (json.RawMessage, error) {
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return nil, err
	}
	return s.sidecar.GetAgentForm(conversation.OpenCodeSessionID, formID)
}

func (s *AgentChatService) ReplyConversationPermission(id, requestID, decision, message string) error {
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return err
	}
	return s.sidecar.ReplyAgentPermission(conversation.OpenCodeSessionID, requestID, decision, message)
}

func (s *AgentChatService) ReplyConversationForm(id, formID string, answer map[string]any) error {
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return err
	}
	return s.sidecar.ReplyAgentForm(conversation.OpenCodeSessionID, formID, answer)
}

func (s *AgentChatService) CancelConversationForm(id, formID string) error {
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return err
	}
	return s.sidecar.CancelAgentForm(conversation.OpenCodeSessionID, formID)
}

func (s *AgentChatService) SendMessage(id string, input SendAgentMessageInput) (*model.AgentMessage, *model.AgentMessage, error) {
	message := strings.TrimSpace(input.Message)
	if input.Delivery == "" {
		input.Delivery = "queue"
	}
	if input.Delivery != "queue" && input.Delivery != "steer" {
		return nil, nil, &ValidationError{Message: "delivery must be steer or queue"}
	}
	if message == "" && input.RetryMessageID == "" {
		return nil, nil, &ValidationError{Message: "message is required"}
	}
	conversation, err := s.conversationStore.GetConversation(id, model.AgentConversationSource)
	if err != nil {
		return nil, nil, err
	}

	var userMessage *model.AgentMessage
	var prompt string
	if input.RetryMessageID != "" {
		userMessage, err = s.conversationStore.GetMessage(input.RetryMessageID, id)
		if err != nil || userMessage.Role != "user" || userMessage.DeliveryStatus != "failed" {
			return nil, nil, &ValidationError{Message: "only failed user messages can be retried"}
		}
		message = userMessage.Content
		prompt = userMessage.Prompt
		input.Delivery = userMessage.DeliveryMode
		if prompt == "" {
			_, context, resolveErr := s.resolveContexts(userMessage.Contexts)
			if resolveErr != nil {
				return nil, nil, resolveErr
			}
			prompt = message
			if context != "" {
				prompt += "\n\n---\nSelected Smart Board context (resolved by LifeOS):\n" + context
			}
		}
		if err := s.conversationStore.UpdateMessageDelivery(userMessage.ID, id, "pending", ""); err != nil {
			return nil, nil, fmt.Errorf("mark retry pending: %w", err)
		}
		userMessage.DeliveryStatus, userMessage.DeliveryError = "pending", ""
	} else {
		contexts, context, resolveErr := s.resolveContexts(input.Contexts)
		if resolveErr != nil {
			return nil, nil, resolveErr
		}
		prompt = message
		if context != "" {
			prompt += "\n\n---\nSelected Smart Board context (resolved by LifeOS):\n" + context
		}
		messageID := input.MessageID
		if messageID == "" {
			messageID = uuid.NewString()
		}
		userMessage = &model.AgentMessage{
			ID: messageID, ConversationID: id, Role: "user", Content: message, Contexts: contexts,
			DeliveryMode: input.Delivery, DeliveryStatus: "pending", Prompt: prompt, CreatedAt: time.Now(),
		}
		if err := s.conversationStore.AddMessage(userMessage); err != nil {
			return nil, nil, fmt.Errorf("save user message: %w", err)
		}
		if conversation.Title == newAgentConversationTitle {
			if err := s.conversationStore.UpdateConversationTitle(id, model.AgentConversationSource, agentConversationTitle(message)); err != nil {
				return nil, nil, fmt.Errorf("update conversation title: %w", err)
			}
		}
	}
	response, err := s.sidecar.SendAgentSessionChat(sidecar.AgentSessionChatRequest{
		SessionID: conversation.OpenCodeSessionID, Message: prompt, RequestID: input.RequestID,
		MessageID: userMessage.ID, Delivery: input.Delivery,
	})
	if err != nil {
		deliveryError := "Delivery failed"
		_ = s.conversationStore.UpdateMessageDelivery(userMessage.ID, id, "failed", deliveryError)
		userMessage.DeliveryStatus, userMessage.DeliveryError = "failed", deliveryError
		return userMessage, nil, fmt.Errorf("continue agent session: %w", err)
	}
	if err := s.conversationStore.UpdateMessageDelivery(userMessage.ID, id, "accepted", ""); err != nil {
		return userMessage, nil, fmt.Errorf("mark message accepted: %w", err)
	}
	userMessage.DeliveryStatus, userMessage.DeliveryError = "accepted", ""
	assistantMessage := &model.AgentMessage{
		ID: uuid.NewString(), ConversationID: id, Role: "assistant", Content: response.Response, CreatedAt: time.Now(),
	}
	if response.AssistantMessageID != "" {
		assistantMessage.ID = "opencode-" + response.AssistantMessageID
	}
	if err := s.conversationStore.AddMessage(assistantMessage); err != nil {
		// Multiple steered HTTP calls can share one final assistant message.
		// Treat a concurrently persisted copy of that exact upstream message as success.
		if existing, getErr := s.conversationStore.GetMessage(assistantMessage.ID, id); getErr == nil && existing.Role == "assistant" {
			return userMessage, existing, nil
		}
		return userMessage, nil, fmt.Errorf("save assistant message: %w", err)
	}
	return userMessage, assistantMessage, nil
}

var agentPanelLabels = map[string]string{
	"things-to-remember": "Things to Remember",
	"suggestions":        "Suggestions",
	"achievements":       "Achievements",
	"blockers":           "Blockers",
}

func (s *AgentChatService) resolveContexts(requested []model.AgentMessageContext) ([]model.AgentMessageContext, string, error) {
	if len(requested) == 0 {
		return nil, "", nil
	}
	if s.smartBoardStore == nil {
		return nil, "", &ValidationError{Message: "smart board context is unavailable"}
	}

	resolved := make([]model.AgentMessageContext, 0, len(requested))
	context := make([]json.RawMessage, 0, len(requested))
	for _, ref := range requested {
		panelLabel, ok := agentPanelLabels[ref.PanelType]
		if !ok || (ref.Kind != "panel" && ref.Kind != "card") {
			return nil, "", &ValidationError{Message: "invalid smart board context reference"}
		}
		panel, err := s.smartBoardStore.GetLatestPanel(ref.PanelType)
		if err != nil {
			return nil, "", fmt.Errorf("resolve smart board context: %w", err)
		}
		if panel == nil || !json.Valid([]byte(panel.Data)) {
			return nil, "", &ValidationError{Message: "smart board context reference was not found"}
		}

		if ref.Kind == "panel" {
			resolved = append(resolved, model.AgentMessageContext{Kind: "panel", PanelType: ref.PanelType, Label: panelLabel})
			entry, _ := json.Marshal(map[string]any{
				"type": "panel", "panelType": ref.PanelType, "data": json.RawMessage(panel.Data),
			})
			context = append(context, entry)
			continue
		}
		if ref.ItemID == "" {
			return nil, "", &ValidationError{Message: "card context reference requires itemId"}
		}
		item, label, ok := resolveAgentPanelItem(panel.Data, ref.ItemID)
		if !ok {
			return nil, "", &ValidationError{Message: "smart board context reference was not found"}
		}
		resolved = append(resolved, model.AgentMessageContext{
			Kind: "card", PanelType: ref.PanelType, ItemID: ref.ItemID, Label: label,
		})
		entry, _ := json.Marshal(map[string]any{
			"type": "card", "panelType": ref.PanelType, "itemId": ref.ItemID, "data": item,
		})
		context = append(context, entry)
	}

	encoded, err := json.Marshal(context)
	if err != nil {
		return nil, "", err
	}
	return resolved, string(encoded), nil
}

func resolveAgentPanelItem(panelData, itemID string) (map[string]any, string, bool) {
	var wrapper map[string]json.RawMessage
	if err := json.Unmarshal([]byte(panelData), &wrapper); err != nil {
		return nil, "", false
	}
	for _, raw := range wrapper {
		var items []map[string]any
		if json.Unmarshal(raw, &items) != nil {
			continue
		}
		for _, item := range items {
			if id, _ := item["id"].(string); id == itemID {
				label, _ := item["title"].(string)
				if strings.TrimSpace(label) == "" {
					label = itemID
				}
				return item, label, true
			}
		}
	}
	return nil, "", false
}

func agentConversationTitle(message string) string {
	const maxRunes = 60
	runes := []rune(strings.Join(strings.Fields(message), " "))
	if len(runes) <= maxRunes {
		return string(runes)
	}
	return string(runes[:maxRunes]) + "..."
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
	if panels := s.latestPanelsContext(7); panels != "" {
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

		// Panel data is wrapped in an object with a single array key that
		// varies per panel ("items" / "blockers" / "suggestions" /
		// "achievements"). Unmarshal into a generic map and pluck the first
		// array we find.
		var wrapper map[string]any
		if err := json.Unmarshal([]byte(panel.Data), &wrapper); err != nil {
			continue
		}

		var items []map[string]any
		for _, v := range wrapper {
			raw, ok := v.([]any)
			if !ok {
				continue
			}
			for _, r := range raw {
				if m, ok := r.(map[string]any); ok {
					items = append(items, m)
				}
			}
			break // one array per panel — stop at the first
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

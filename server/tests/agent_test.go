package tests

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/api/agents"
	"github.com/thein3rovert/lifeos/server/internal/model"
	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/sidecar"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

type agentConversationStoreStub struct {
	mu            sync.Mutex
	conversation  *model.AgentConversation
	messages      []model.AgentMessage
	requestedWith string
}

func (s *agentConversationStoreStub) CreateConversation(conversation *model.AgentConversation) error {
	s.conversation = conversation
	return nil
}

func (s *agentConversationStoreStub) ListConversations(source string) ([]model.AgentConversation, error) {
	s.requestedWith = source
	return []model.AgentConversation{}, nil
}

func (s *agentConversationStoreStub) GetConversation(_ string, source string) (*model.AgentConversation, error) {
	s.requestedWith = source
	return s.conversation, nil
}

func (s *agentConversationStoreStub) UpdateConversationTitle(_ string, source string, title string) error {
	s.requestedWith = source
	s.conversation.Title = title
	return nil
}

func (s *agentConversationStoreStub) AddMessage(message *model.AgentMessage) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.messages = append(s.messages, *message)
	return nil
}

func (s *agentConversationStoreStub) GetMessage(id, conversationID string) (*model.AgentMessage, error) {
	for i := range s.messages {
		if s.messages[i].ID == id && s.messages[i].ConversationID == conversationID {
			return &s.messages[i], nil
		}
	}
	return nil, store.ErrAgentConversationNotFound
}

func (s *agentConversationStoreStub) UpdateMessageDelivery(id, conversationID, status, deliveryError string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.messages {
		if s.messages[i].ID == id && s.messages[i].ConversationID == conversationID {
			s.messages[i].DeliveryStatus, s.messages[i].DeliveryError = status, deliveryError
			return nil
		}
	}
	return store.ErrAgentConversationNotFound
}

func (s *agentConversationStoreStub) ListMessages(string) ([]model.AgentMessage, error) {
	return s.messages, nil
}

func TestAgentConversationStoreFiltersSourceAndPersistsMessages(t *testing.T) {
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	chatStore := store.NewAgentConversationStore(db.DB())

	empty, err := chatStore.ListConversations(model.AgentConversationSource)
	if err != nil || empty == nil || len(empty) != 0 {
		t.Fatalf("empty conversations = %#v, err = %v", empty, err)
	}

	now := time.Now().UTC().Truncate(time.Second)
	for _, conversation := range []*model.AgentConversation{
		{ID: "floating", Source: model.AgentConversationSource, Title: "Visible", OpenCodeSessionID: "session-1", CreatedAt: now, UpdatedAt: now},
		{ID: "other", Source: "other-caller", Title: "Hidden", OpenCodeSessionID: "session-2", CreatedAt: now, UpdatedAt: now},
	} {
		if err := chatStore.CreateConversation(conversation); err != nil {
			t.Fatal(err)
		}
	}
	for _, message := range []*model.AgentMessage{
		{ID: "1", ConversationID: "floating", Role: "user", Content: "hello", Contexts: []model.AgentMessageContext{{Kind: "card", PanelType: "blockers", ItemID: "b-1", Label: "Waiting on review"}}, CreatedAt: now},
		{ID: "2", ConversationID: "floating", Role: "assistant", Content: "hi", CreatedAt: now.Add(time.Second)},
	} {
		if err := chatStore.AddMessage(message); err != nil {
			t.Fatal(err)
		}
	}
	if err := chatStore.AddMessage(&model.AgentMessage{ID: "2", ConversationID: "floating", Role: "assistant", Content: "hi", CreatedAt: now.Add(time.Second)}); err != nil {
		t.Fatalf("duplicate assistant should be idempotent: %v", err)
	}

	conversations, err := chatStore.ListConversations(model.AgentConversationSource)
	if err != nil || len(conversations) != 1 || conversations[0].ID != "floating" {
		t.Fatalf("conversations = %#v, err = %v", conversations, err)
	}
	messages, err := chatStore.ListMessages("floating")
	if err != nil || len(messages) != 2 || messages[0].Content != "hello" || len(messages[0].Contexts) != 1 || messages[0].Contexts[0].Label != "Waiting on review" || messages[1].Content != "hi" {
		t.Fatalf("messages = %#v, err = %v", messages, err)
	}
}

func TestAgentMessageContextRefsMigrationPreservesExistingDatabase(t *testing.T) {
	dsn := filepath.Join(t.TempDir(), "lifeos.db")
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`CREATE TABLE agent_conversations (
		id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL,
		opencode_session_id TEXT NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL);
		CREATE TABLE agent_messages (
		id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL,
		content TEXT NOT NULL, created_at DATETIME NOT NULL);
		INSERT INTO agent_conversations VALUES ('c-1', 'floating-chat', 'Old', 's-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		INSERT INTO agent_messages VALUES ('m-1', 'c-1', 'user', 'old message', CURRENT_TIMESTAMP);`)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Close(); err != nil {
		t.Fatal(err)
	}

	dbStore, err := store.NewSQLiteStore(dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer dbStore.DB().Close()
	messages, err := store.NewAgentConversationStore(dbStore.DB()).ListMessages("c-1")
	if err != nil || len(messages) != 1 || messages[0].Content != "old message" || len(messages[0].Contexts) != 0 {
		t.Fatalf("messages = %#v, err = %v", messages, err)
	}
}

func TestAgentChatServiceCreatesThenStrictlyContinuesSession(t *testing.T) {
	var continuedSession string
	sidecarServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/agent/session":
			_ = json.NewEncoder(w).Encode(map[string]string{"sessionId": "session-1"})
		case "/agent/session/chat":
			var request sidecar.AgentSessionChatRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				t.Fatal(err)
			}
			continuedSession = request.SessionID
			_ = json.NewEncoder(w).Encode(map[string]string{"response": "assistant reply", "sessionId": "session-1", "assistantMessageId": "assistant-1"})
		default:
			http.NotFound(w, r)
		}
	}))
	defer sidecarServer.Close()

	chatStore := &agentConversationStoreStub{}
	svc := service.NewAgentChatService(nil, nil, nil, nil, sidecar.New(sidecarServer.URL), chatStore)
	conversation, err := svc.CreateConversation()
	if err != nil {
		t.Fatal(err)
	}
	_, reply, err := svc.SendMessage(conversation.ID, service.SendAgentMessageInput{Message: "A useful first message"})
	if err != nil {
		t.Fatal(err)
	}
	if continuedSession != "session-1" || reply.Content != "assistant reply" {
		t.Fatalf("continued session = %q, reply = %#v", continuedSession, reply)
	}
	if chatStore.requestedWith != model.AgentConversationSource || len(chatStore.messages) != 2 {
		t.Fatalf("source = %q, messages = %#v", chatStore.requestedWith, chatStore.messages)
	}
}

func TestAgentChatServiceResolvesContextForPromptAndPersistsReferences(t *testing.T) {
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	boardStore := store.NewSmartBoardStore(db.DB())
	if err := boardStore.SavePanel("blockers", model.BlockersData{Blockers: []model.BlockerItem{
		{ID: "b-1", Title: "Waiting on review", Blocker: "PR 42 needs approval", Context: "Release is paused"},
	}}, "", ""); err != nil {
		t.Fatal(err)
	}
	if err := boardStore.SavePanel("achievements", model.AchievementsData{Achievements: []model.AchievementItem{
		{ID: "a-1", Title: "Shipped API", Achievement: "Released the API"},
	}}, "", ""); err != nil {
		t.Fatal(err)
	}

	var sidecarPrompt string
	sidecarServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/agent/session":
			_ = json.NewEncoder(w).Encode(map[string]string{"sessionId": "session-1"})
		case "/agent/session/chat":
			var request sidecar.AgentSessionChatRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				t.Fatal(err)
			}
			sidecarPrompt = request.Message
			_ = json.NewEncoder(w).Encode(map[string]string{"response": "reply"})
		default:
			http.NotFound(w, r)
		}
	}))
	defer sidecarServer.Close()

	conversationStore := store.NewAgentConversationStore(db.DB())
	svc := service.NewAgentChatService(nil, nil, nil, boardStore, sidecar.New(sidecarServer.URL), conversationStore)
	conversation, err := svc.CreateConversation()
	if err != nil {
		t.Fatal(err)
	}
	_, _, err = svc.SendMessage(conversation.ID, service.SendAgentMessageInput{
		Message: "Help me prioritize", Contexts: []model.AgentMessageContext{
			{Kind: "card", PanelType: "blockers", ItemID: "b-1", Label: "forged label"},
			{Kind: "panel", PanelType: "achievements", Label: "forged panel"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(sidecarPrompt, "Help me prioritize") || !strings.Contains(sidecarPrompt, "PR 42 needs approval") || !strings.Contains(sidecarPrompt, "Released the API") || strings.Contains(sidecarPrompt, "forged") {
		t.Fatalf("sidecar prompt = %q", sidecarPrompt)
	}
	_, messages, err := svc.GetConversation(conversation.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(messages) != 2 || messages[0].Content != "Help me prioritize" || strings.Contains(messages[0].Content, "PR 42") || len(messages[0].Contexts) != 2 {
		t.Fatalf("messages = %#v", messages)
	}
	if messages[0].Contexts[0].Label != "Waiting on review" || messages[0].Contexts[1].Label != "Achievements" {
		t.Fatalf("contexts = %#v", messages[0].Contexts)
	}
}

func TestAgentChatServiceRejectsMissingSmartBoardContext(t *testing.T) {
	chatStore := &agentConversationStoreStub{conversation: &model.AgentConversation{
		ID: "conversation-1", Source: model.AgentConversationSource, OpenCodeSessionID: "session-1",
	}}
	svc := service.NewAgentChatService(nil, nil, nil, nil, sidecar.New("http://unused"), chatStore)
	_, _, err := svc.SendMessage("conversation-1", service.SendAgentMessageInput{
		Message: "hello", Contexts: []model.AgentMessageContext{{Kind: "card", PanelType: "blockers", ItemID: "missing"}},
	})
	if err == nil || !strings.Contains(err.Error(), "unavailable") || len(chatStore.messages) != 0 {
		t.Fatalf("err = %v, messages = %#v", err, chatStore.messages)
	}
}

func TestAgentChatDeliveryFailurePersistsAndRetryPreservesPromptAndContexts(t *testing.T) {
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	boardStore := store.NewSmartBoardStore(db.DB())
	if err := boardStore.SavePanel("blockers", model.BlockersData{Blockers: []model.BlockerItem{
		{ID: "b-1", Title: "Waiting on review", Blocker: "PR 42 needs approval"},
	}}, "", ""); err != nil {
		t.Fatal(err)
	}

	var attempts []sidecar.AgentSessionChatRequest
	sidecarServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/agent/session" {
			_ = json.NewEncoder(w).Encode(map[string]string{"sessionId": "session-1"})
			return
		}
		var input sidecar.AgentSessionChatRequest
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatal(err)
		}
		attempts = append(attempts, input)
		if len(attempts) == 1 {
			http.Error(w, "temporary", http.StatusBadGateway)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"response": "recovered", "assistantMessageId": "assistant-retry"})
	}))
	defer sidecarServer.Close()

	conversationStore := store.NewAgentConversationStore(db.DB())
	svc := service.NewAgentChatService(nil, nil, nil, boardStore, sidecar.New(sidecarServer.URL), conversationStore)
	conversation, err := svc.CreateConversation()
	if err != nil {
		t.Fatal(err)
	}
	failed, _, err := svc.SendMessage(conversation.ID, service.SendAgentMessageInput{
		Message: "Help", MessageID: "message-1", RequestID: "request-1", Delivery: "steer",
		Contexts: []model.AgentMessageContext{{Kind: "card", PanelType: "blockers", ItemID: "b-1"}},
	})
	if err == nil || failed.DeliveryStatus != "failed" {
		t.Fatalf("failed = %#v, err = %v", failed, err)
	}

	retried, assistant, err := svc.SendMessage(conversation.ID, service.SendAgentMessageInput{
		RetryMessageID: "message-1", RequestID: "request-2", Delivery: "queue",
	})
	if err != nil {
		t.Fatal(err)
	}
	if retried.ID != "message-1" || retried.Content != "Help" || retried.DeliveryMode != "steer" || retried.DeliveryStatus != "accepted" || len(retried.Contexts) != 1 || assistant.Content != "recovered" {
		t.Fatalf("retried = %#v assistant = %#v", retried, assistant)
	}
	if len(attempts) != 2 || attempts[0].Message != attempts[1].Message || attempts[1].Delivery != "steer" || attempts[1].MessageID != "message-1" || !strings.Contains(attempts[1].Message, "PR 42") {
		t.Fatalf("attempts = %#v", attempts)
	}
	messages, err := conversationStore.ListMessages(conversation.ID)
	if err != nil || len(messages) != 2 || messages[0].ID != "message-1" || messages[0].DeliveryStatus != "accepted" {
		t.Fatalf("messages = %#v err = %v", messages, err)
	}
}

func TestAgentHandlerConversationAPIShapesAndPrivateSessionID(t *testing.T) {
	sidecarServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/agent/session":
			_ = json.NewEncoder(w).Encode(map[string]string{"sessionId": "private-session"})
		case "/agent/session/chat":
			_ = json.NewEncoder(w).Encode(map[string]string{"response": "assistant reply", "sessionId": "private-session"})
		default:
			http.NotFound(w, r)
		}
	}))
	defer sidecarServer.Close()
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	svc := service.NewAgentChatService(nil, nil, nil, nil, sidecar.New(sidecarServer.URL), store.NewAgentConversationStore(db.DB()))
	handler := agents.NewAgentChatHandler(svc)

	listResponse := httptest.NewRecorder()
	handler.ListConversations(listResponse, httptest.NewRequest(http.MethodGet, "/api/agent/conversations", nil))
	if listResponse.Body.String() != "{\"conversations\":[]}\n" {
		t.Fatalf("empty list body = %s", listResponse.Body.String())
	}
	createResponse := httptest.NewRecorder()
	handler.CreateConversation(createResponse, httptest.NewRequest(http.MethodPost, "/api/agent/conversations", nil))
	if createResponse.Code != http.StatusCreated || strings.Contains(createResponse.Body.String(), "private-session") {
		t.Fatalf("create status/body = %d %s", createResponse.Code, createResponse.Body.String())
	}
	var created struct {
		Conversation struct {
			ID string `json:"id"`
		} `json:"conversation"`
	}
	if err := json.Unmarshal(createResponse.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}

	sendRequest := httptest.NewRequest(http.MethodPost, "/api/agent/conversations/"+created.Conversation.ID+"/messages", strings.NewReader(`{"message":"hello"}`))
	sendRequest.SetPathValue("conversationId", created.Conversation.ID)
	sendResponse := httptest.NewRecorder()
	handler.SendConversationMessage(sendResponse, sendRequest)
	if sendResponse.Code != http.StatusOK || !strings.Contains(sendResponse.Body.String(), `"message":`) || strings.Contains(sendResponse.Body.String(), "private-session") {
		t.Fatalf("send status/body = %d %s", sendResponse.Code, sendResponse.Body.String())
	}
}

func TestSidecarClientExplicitAgentSessionMethods(t *testing.T) {
	var continued sidecar.AgentSessionChatRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/agent/session":
			_ = json.NewEncoder(w).Encode(map[string]string{"sessionId": "session-1"})
		case "/agent/session/chat":
			if err := json.NewDecoder(r.Body).Decode(&continued); err != nil {
				t.Fatal(err)
			}
			_ = json.NewEncoder(w).Encode(map[string]string{"response": "reply", "sessionId": "session-1", "assistantMessageId": "assistant-1"})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()
	client := sidecar.New(server.URL)

	sessionID, err := client.CreateAgentSession("floating", "context")
	if err != nil || sessionID != "session-1" {
		t.Fatalf("CreateAgentSession() = %q, %v", sessionID, err)
	}
	reply, err := client.SendAgentSessionChat(sidecar.AgentSessionChatRequest{
		SessionID: sessionID, Message: "hello", RequestID: "request-1",
	})
	if err != nil || reply.Response != "reply" || reply.AssistantMessageID != "assistant-1" || continued.SessionID != sessionID {
		t.Fatalf("reply = %#v, request = %#v, err = %v", reply, continued, err)
	}
}

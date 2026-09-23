package tests

import (
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
		{ID: "1", ConversationID: "floating", Role: "user", Content: "hello", CreatedAt: now},
		{ID: "2", ConversationID: "floating", Role: "assistant", Content: "hi", CreatedAt: now.Add(time.Second)},
	} {
		if err := chatStore.AddMessage(message); err != nil {
			t.Fatal(err)
		}
	}

	conversations, err := chatStore.ListConversations(model.AgentConversationSource)
	if err != nil || len(conversations) != 1 || conversations[0].ID != "floating" {
		t.Fatalf("conversations = %#v, err = %v", conversations, err)
	}
	messages, err := chatStore.ListMessages("floating")
	if err != nil || len(messages) != 2 || messages[0].Content != "hello" || messages[1].Content != "hi" {
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
			_ = json.NewEncoder(w).Encode(map[string]string{"response": "assistant reply", "sessionId": "session-1"})
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
	reply, err := svc.SendMessage(conversation.ID, service.SendAgentMessageInput{Message: "A useful first message"})
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
			_ = json.NewEncoder(w).Encode(map[string]string{"response": "reply", "sessionId": "session-1"})
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
	if err != nil || reply != "reply" || continued.SessionID != sessionID {
		t.Fatalf("reply = %q, request = %#v, err = %v", reply, continued, err)
	}
}

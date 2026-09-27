package tests

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/api/agents"
	"github.com/thein3rovert/lifeos/server/internal/model"
	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/sidecar"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

func TestDeleteConversationRemovesOnlySelectedHistory(t *testing.T) {
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	conversations := store.NewAgentConversationStore(db.DB())
	for _, id := range []string{"delete-me", "keep-me"} {
		if err := conversations.CreateConversation(&model.AgentConversation{
			ID: id, Source: model.AgentConversationSource, Title: id,
			OpenCodeSessionID: "ses-" + id, CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}); err != nil {
			t.Fatal(err)
		}
		if err := conversations.AddMessage(&model.AgentMessage{ID: "msg-" + id, ConversationID: id,
			Role: "user", Content: "hello", CreatedAt: time.Now()}); err != nil {
			t.Fatal(err)
		}
	}
	var removedPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		removedPath = r.URL.Path
		w.WriteHeader(http.StatusNoContent)
	}))
	defer upstream.Close()
	handler := agents.NewAgentChatHandler(service.NewAgentChatService(nil, nil, nil, nil, sidecar.New(upstream.URL), conversations))
	req := httptest.NewRequest(http.MethodDelete, "/api/agent/conversations/delete-me", nil)
	req.SetPathValue("conversationId", "delete-me")
	res := httptest.NewRecorder()
	handler.DeleteConversation(res, req)
	if res.Code != http.StatusNoContent || removedPath != "/agent/session/ses-delete-me" {
		t.Fatalf("status=%d upstream=%q", res.Code, removedPath)
	}
	if _, err := conversations.GetConversation("delete-me", model.AgentConversationSource); !errors.Is(err, store.ErrAgentConversationNotFound) {
		t.Fatalf("deleted conversation still exists: %v", err)
	}
	deletedMessages, _ := conversations.ListMessages("delete-me")
	keptMessages, _ := conversations.ListMessages("keep-me")
	if len(deletedMessages) != 0 || len(keptMessages) != 1 {
		t.Fatalf("deleted=%d kept=%d", len(deletedMessages), len(keptMessages))
	}
	if _, err := conversations.GetConversation("keep-me", model.AgentConversationSource); err != nil {
		t.Fatal(err)
	}
}

func TestDeleteConversationKeepsHistoryOnFailure(t *testing.T) {
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	conversations := store.NewAgentConversationStore(db.DB())
	if err := conversations.CreateConversation(&model.AgentConversation{ID: "chat", Source: model.AgentConversationSource,
		Title: "chat", OpenCodeSessionID: "ses-chat", CreatedAt: time.Now(), UpdatedAt: time.Now()}); err != nil {
		t.Fatal(err)
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "private upstream details", http.StatusBadGateway)
	}))
	defer upstream.Close()
	handler := agents.NewAgentChatHandler(service.NewAgentChatService(nil, nil, nil, nil, sidecar.New(upstream.URL), conversations))
	for _, id := range []string{"missing", "chat"} {
		req := httptest.NewRequest(http.MethodDelete, "/", nil)
		req.SetPathValue("conversationId", id)
		res := httptest.NewRecorder()
		handler.DeleteConversation(res, req)
		want := http.StatusBadGateway
		if id == "missing" {
			want = http.StatusNotFound
		}
		if res.Code != want {
			t.Fatalf("id=%s status=%d want=%d", id, res.Code, want)
		}
		if id == "chat" && res.Body.String() == "private upstream details" {
			t.Fatal("upstream error leaked")
		}
	}
	if _, err := conversations.GetConversation("chat", model.AgentConversationSource); err != nil {
		t.Fatal(err)
	}
}

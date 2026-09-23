package tests

import (
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/api/agents"
	"github.com/thein3rovert/lifeos/server/internal/model"
	service "github.com/thein3rovert/lifeos/server/internal/services"
	"github.com/thein3rovert/lifeos/server/internal/sidecar"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

func TestConversationActivityResolvesPrivateSessionAndProxiesSSE(t *testing.T) {
	var requestedPath string
	sidecarServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestedPath = r.URL.Path
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "data: {\"id\":\"event-1\",\"kind\":\"tool\"}\n\n")
	}))
	defer sidecarServer.Close()

	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	conversationStore := store.NewAgentConversationStore(db.DB())
	conversation := &model.AgentConversation{
		ID: "conversation-1", Source: model.AgentConversationSource, Title: "Private",
		OpenCodeSessionID: "ses_private", CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := conversationStore.CreateConversation(conversation); err != nil {
		t.Fatal(err)
	}

	svc := service.NewAgentChatService(nil, nil, nil, nil, sidecar.New(sidecarServer.URL), conversationStore)
	handler := agents.NewAgentChatHandler(svc)
	request := httptest.NewRequest(http.MethodGet, "/api/agent/conversations/conversation-1/activity", nil)
	request.SetPathValue("conversationId", "conversation-1")
	response := httptest.NewRecorder()
	handler.StreamConversationActivity(response, request)

	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "text/event-stream" {
		t.Fatalf("status/headers = %d %#v", response.Code, response.Header())
	}
	if requestedPath != "/agent/session/ses_private/activity" {
		t.Fatalf("sidecar path = %q", requestedPath)
	}
	if strings.Contains(response.Body.String(), "ses_private") || !strings.Contains(response.Body.String(), "event-1") {
		t.Fatalf("proxied body = %q", response.Body.String())
	}
}

func TestConversationActivityRejectsUnknownConversationBeforeProxying(t *testing.T) {
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	svc := service.NewAgentChatService(nil, nil, nil, nil, sidecar.New("http://unused"), store.NewAgentConversationStore(db.DB()))
	handler := agents.NewAgentChatHandler(svc)
	request := httptest.NewRequest(http.MethodGet, "/api/agent/conversations/missing/activity", nil)
	request.SetPathValue("conversationId", "missing")
	response := httptest.NewRecorder()
	handler.StreamConversationActivity(response, request)
	if response.Code != http.StatusNotFound {
		t.Fatalf("status/body = %d %s", response.Code, response.Body.String())
	}
}

func TestConversationActivityDoesNotLeakPrivateSessionOnUpstreamFailure(t *testing.T) {
	sidecarServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "failed for ses_private", http.StatusInternalServerError)
	}))
	defer sidecarServer.Close()
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.DB().Close()
	conversationStore := store.NewAgentConversationStore(db.DB())
	conversation := &model.AgentConversation{
		ID: "conversation-1", Source: model.AgentConversationSource, Title: "Private",
		OpenCodeSessionID: "ses_private", CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := conversationStore.CreateConversation(conversation); err != nil {
		t.Fatal(err)
	}
	svc := service.NewAgentChatService(nil, nil, nil, nil, sidecar.New(sidecarServer.URL), conversationStore)
	handler := agents.NewAgentChatHandler(svc)
	request := httptest.NewRequest(http.MethodGet, "/api/agent/conversations/conversation-1/activity", nil)
	request.SetPathValue("conversationId", "conversation-1")
	response := httptest.NewRecorder()
	handler.StreamConversationActivity(response, request)
	if response.Code != http.StatusBadGateway || strings.Contains(response.Body.String(), "ses_private") {
		t.Fatalf("status/body = %d %s", response.Code, response.Body.String())
	}
}

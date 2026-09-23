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

func interactionHandler(t *testing.T, upstream http.HandlerFunc) (*agents.AgentChatHandler, *httptest.Server) {
	t.Helper()
	server := httptest.NewServer(upstream)
	db, err := store.NewSQLiteStore(filepath.Join(t.TempDir(), "lifeos.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.DB().Close() })
	conversations := store.NewAgentConversationStore(db.DB())
	if err := conversations.CreateConversation(&model.AgentConversation{ID: "conversation-1", Source: model.AgentConversationSource, Title: "Private", OpenCodeSessionID: "ses_private", CreatedAt: time.Now(), UpdatedAt: time.Now()}); err != nil {
		t.Fatal(err)
	}
	return agents.NewAgentChatHandler(service.NewAgentChatService(nil, nil, nil, nil, sidecar.New(server.URL), conversations)), server
}

func TestConversationInteractionsResolvePrivateSessionWithoutLeakingIt(t *testing.T) {
	paths := []string{}
	handler, server := interactionHandler(t, func(w http.ResponseWriter, r *http.Request) {
		paths = append(paths, r.URL.Path)
		if strings.HasSuffix(r.URL.Path, "/permissions") {
			io.WriteString(w, `{"permissions":[]}`)
		} else {
			io.WriteString(w, `{"forms":[]}`)
		}
	})
	defer server.Close()
	req := httptest.NewRequest(http.MethodGet, "/api/agent/conversations/conversation-1/interactions", nil)
	req.SetPathValue("conversationId", "conversation-1")
	res := httptest.NewRecorder()
	handler.ListConversationInteractions(res, req)
	if res.Code != 200 || strings.Contains(res.Body.String(), "ses_private") {
		t.Fatalf("status/body = %d %s", res.Code, res.Body.String())
	}
	if len(paths) != 2 || !strings.Contains(paths[0], "ses_private") || !strings.Contains(paths[1], "ses_private") {
		t.Fatalf("paths = %#v", paths)
	}
}

func TestConversationPermissionReplyUsesPrivateSessionAndSanitizesFailure(t *testing.T) {
	var path string
	handler, server := interactionHandler(t, func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path
		http.Error(w, "ses_private failed", 409)
	})
	defer server.Close()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"decision":"once"}`))
	req.SetPathValue("conversationId", "conversation-1")
	req.SetPathValue("requestId", "permission-1")
	res := httptest.NewRecorder()
	handler.ReplyConversationPermission(res, req)
	if !strings.Contains(path, "/ses_private/") || res.Code != http.StatusBadGateway || strings.Contains(res.Body.String(), "ses_private") {
		t.Fatalf("path/status/body = %s %d %s", path, res.Code, res.Body.String())
	}
}

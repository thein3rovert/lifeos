package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/thein3rovert/lifeos/server/internal/sidecar"
)

// Check missing session returns empty lists, not an error. UI stays quiet.
func TestInteractionsMissingSessionReturnsEmpty(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "not found", http.StatusNotFound)
	}))
	defer server.Close()
	got, err := sidecar.New(server.URL).ListAgentInteractions("ses_gone")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got.Permissions == nil || got.Forms == nil {
		t.Fatalf("expected empty lists, got %+v", got)
	}
	if len(got.Permissions) != 0 || len(got.Forms) != 0 {
		t.Fatalf("expected zero items, got %+v", got)
	}
}

// Check real sidecar failure still returns an error for logs.
func TestInteractionsServerErrorStillFails(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer server.Close()
	if _, err := sidecar.New(server.URL).ListAgentInteractions("ses_1"); err == nil {
		t.Fatal("expected error for 500, got nil")
	}
}

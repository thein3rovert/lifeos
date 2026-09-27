package service

import (
	"strings"
	"testing"
)

// Check every panel prompt tells AI to return JSON only.
func TestPromptsAskForJSONOnly(t *testing.T) {
	svc := &SmartBoardService{meetingsPath: "/m", journalPath: "/j"}
	for _, panel := range []string{"things-to-remember", "suggestions", "achievements", "blockers"} {
		prompt, err := svc.getPromptForPanel(panel, "")
		if err != nil {
			t.Fatalf("%s prompt error: %v", panel, err)
		}
		if !strings.Contains(prompt, "VALID JSON ONLY") {
			t.Fatalf("%s prompt missing JSON rule", panel)
		}
	}
}

// Check markdown is removed so AI text can parse.
func TestCleanJSONStripsMarkdown(t *testing.T) {
	got := cleanJSONResponse("```json\n[{\"id\":\"1\"}]\n```")
	if strings.TrimSpace(got) != `[{"id":"1"}]` {
		t.Fatalf("bad clean: %q", got)
	}
}

// Check {items:[...]} wrapper is opened to array.
func TestUnwrapItemsWrapper(t *testing.T) {
	got := unwrapJSONArray("things-to-remember", `{"items": [{"id":"1"}]}`)
	if strings.TrimSpace(got) != `[{"id":"1"}]` {
		t.Fatalf("bad unwrap: %q", got)
	}
}

// Check users see short friendly text, not raw error.
func TestFriendlyErrorHidesRaw(t *testing.T) {
	err := friendlyPanelError("achievements")
	if err == nil || !strings.Contains(err.Error(), "temporarily unavailable") {
		t.Fatalf("bad friendly error: %v", err)
	}
	if strings.Contains(err.Error(), "non-JSON") {
		t.Fatalf("raw text leaked: %v", err)
	}
}

package service

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/thein3rovert/lifeos/internal/model"
)

// computeItemID returns a deterministic 12-char hex ID derived from the
// content fields it represents. Inputs are lowercased and trimmed so that
// trivial whitespace/case differences don't cause new IDs.
func computeItemID(parts ...string) string {
	h := sha256.New()
	for i, p := range parts {
		if i > 0 {
			h.Write([]byte("|"))
		}
		h.Write([]byte(strings.TrimSpace(strings.ToLower(p))))
	}
	return hex.EncodeToString(h.Sum(nil))[:12]
}

// rewriteItemIDs replaces AI-generated item IDs in a parsed panel payload with
// deterministic content-hashed IDs. Returns the same value type with IDs rewritten.
func rewriteItemIDs(panelType string, data interface{}) interface{} {
	switch panelType {
	case "things-to-remember":
		if d, ok := data.(model.ThingsToRememberData); ok {
			for i := range d.Items {
				d.Items[i].ID = computeItemID(d.Items[i].Title, d.Items[i].Source, d.Items[i].Date)
			}
			return d
		}
	case "suggestions":
		if d, ok := data.(model.SuggestionsData); ok {
			for i := range d.Suggestions {
				d.Suggestions[i].ID = computeItemID(d.Suggestions[i].Title, d.Suggestions[i].CreatedAt)
			}
			return d
		}
	case "achievements":
		if d, ok := data.(model.AchievementsData); ok {
			for i := range d.Achievements {
				d.Achievements[i].ID = computeItemID(d.Achievements[i].Title, d.Achievements[i].Source, d.Achievements[i].Date)
			}
			return d
		}
	case "blockers":
		if d, ok := data.(model.BlockersData); ok {
			for i := range d.Blockers {
				d.Blockers[i].ID = computeItemID(d.Blockers[i].Title, d.Blockers[i].Source, d.Blockers[i].Date)
			}
			return d
		}
	}
	return data
}

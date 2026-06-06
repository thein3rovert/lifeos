package service

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
)

// computeItemID returns a deterministic 12-char hex ID derived from the
// content fields it represents. Inputs are lowercased and trimmed so that
// trivial whitespace/case differences don't cause new IDs.
//
// Used as a fallback when AI returns no ID for a brand-new item, or when
// it returns an ID we don't recognize. AI-supplied IDs that match existing
// items take precedence (see merge.go).
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

package service

import (
	"encoding/json"

	"github.com/thein3rovert/lifeos/internal/model"
)

// existingItemRef is the lightweight shape we send to the AI as context
// so it can decide whether a new item matches an existing one. Keeping it
// minimal saves prompt tokens.
type existingItemRef struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// extractExistingItemRefs pulls the simplified id+title list from a stored
// panel's JSON blob. Returns an empty slice (not nil) for safe JSON marshal.
func extractExistingItemRefs(panelType, dataJSON string) []existingItemRef {
	refs := []existingItemRef{}
	if dataJSON == "" {
		return refs
	}

	switch panelType {
	case "things-to-remember":
		var d model.ThingsToRememberData
		if err := json.Unmarshal([]byte(dataJSON), &d); err == nil {
			for _, it := range d.Items {
				refs = append(refs, existingItemRef{ID: it.ID, Title: it.Title})
			}
		}
	case "suggestions":
		var d model.SuggestionsData
		if err := json.Unmarshal([]byte(dataJSON), &d); err == nil {
			for _, it := range d.Suggestions {
				refs = append(refs, existingItemRef{ID: it.ID, Title: it.Title})
			}
		}
	case "achievements":
		var d model.AchievementsData
		if err := json.Unmarshal([]byte(dataJSON), &d); err == nil {
			for _, it := range d.Achievements {
				refs = append(refs, existingItemRef{ID: it.ID, Title: it.Title})
			}
		}
	case "blockers":
		var d model.BlockersData
		if err := json.Unmarshal([]byte(dataJSON), &d); err == nil {
			for _, it := range d.Blockers {
				refs = append(refs, existingItemRef{ID: it.ID, Title: it.Title})
			}
		}
	}
	return refs
}

// existingItemsContext builds the JSON snippet we append to AI prompts so the
// AI can reuse IDs for items it recognizes from a previous refresh. Returns
// an empty string when there are no existing items.
func existingItemsContext(panelType, dataJSON string) string {
	refs := extractExistingItemRefs(panelType, dataJSON)
	if len(refs) == 0 {
		return ""
	}
	b, err := json.Marshal(refs)
	if err != nil {
		return ""
	}
	return string(b)
}

// mergePanelData merges newly-generated AI output with existing stored panel
// data so the user's curated state (category, status) survives a refresh.
//
// Matching rule: an item from `new` is considered the same as an item from
// `old` when they share the same ID. We trust AI to reuse existing IDs for
// semantic matches (because we tell it to in the prompt). Items in `new` with
// an empty or unknown ID are treated as brand new and assigned a deterministic
// content-hash ID.
//
// Items present in `old` but missing from `new` are simply dropped for now.
// Soft-archiving can be added later.
func mergePanelData(panelType string, oldJSON string, newData interface{}) interface{} {
	switch panelType {
	case "things-to-remember":
		return mergeThingsToRemember(oldJSON, newData)
	case "suggestions":
		return mergeSuggestions(oldJSON, newData)
	case "achievements":
		return mergeAchievements(oldJSON, newData)
	case "blockers":
		return mergeBlockers(oldJSON, newData)
	}
	return newData
}

func mergeThingsToRemember(oldJSON string, newData interface{}) interface{} {
	newD, ok := newData.(model.ThingsToRememberData)
	if !ok {
		return newData
	}

	oldByID := map[string]model.ThingsToRememberItem{}
	if oldJSON != "" {
		var oldD model.ThingsToRememberData
		if err := json.Unmarshal([]byte(oldJSON), &oldD); err == nil {
			for _, it := range oldD.Items {
				oldByID[it.ID] = it
			}
		}
	}

	for i, item := range newD.Items {
		// Assign deterministic ID if AI didn't reuse one
		if item.ID == "" || !isKnownID(item.ID, oldByID) {
			item.ID = computeItemID(item.Title, item.Source, item.Date)
		}
		// If existing match, preserve user-owned fields
		if existing, found := oldByID[item.ID]; found {
			if existing.Category != "" {
				item.Category = existing.Category
			}
		}
		newD.Items[i] = item
	}

	return newD
}

func mergeSuggestions(oldJSON string, newData interface{}) interface{} {
	newD, ok := newData.(model.SuggestionsData)
	if !ok {
		return newData
	}

	oldByID := map[string]model.SuggestionItem{}
	if oldJSON != "" {
		var oldD model.SuggestionsData
		if err := json.Unmarshal([]byte(oldJSON), &oldD); err == nil {
			for _, it := range oldD.Suggestions {
				oldByID[it.ID] = it
			}
		}
	}

	for i, item := range newD.Suggestions {
		if item.ID == "" || !isKnownSuggestionID(item.ID, oldByID) {
			item.ID = computeItemID(item.Title, item.CreatedAt)
		}
		if existing, found := oldByID[item.ID]; found {
			if existing.Status != "" {
				item.Status = existing.Status
			}
			// Preserve the original createdAt so timestamps don't drift on refresh
			if existing.CreatedAt != "" {
				item.CreatedAt = existing.CreatedAt
			}
		}
		newD.Suggestions[i] = item
	}

	return newD
}

func mergeAchievements(oldJSON string, newData interface{}) interface{} {
	newD, ok := newData.(model.AchievementsData)
	if !ok {
		return newData
	}

	// Build map of existing achievements by ID
	oldByID := map[string]model.AchievementItem{}
	var oldOrder []string // preserve insertion order
	if oldJSON != "" {
		var oldD model.AchievementsData
		if err := json.Unmarshal([]byte(oldJSON), &oldD); err == nil {
			for _, it := range oldD.Achievements {
				oldByID[it.ID] = it
				oldOrder = append(oldOrder, it.ID)
			}
		}
	}

	// Assign IDs to new items and collect genuinely new ones
	seenIDs := map[string]bool{}
	for i, item := range newD.Achievements {
		if item.ID == "" || !isKnownAchievementID(item.ID, oldByID) {
			item.ID = computeItemID(item.Title, item.Source, item.Date)
		}
		newD.Achievements[i] = item
		seenIDs[item.ID] = true
	}

	// Preserve existing achievements the AI didn't re-emit (append-only)
	for _, id := range oldOrder {
		if !seenIDs[id] {
			newD.Achievements = append(newD.Achievements, oldByID[id])
		}
	}

	return newD
}

func mergeBlockers(oldJSON string, newData interface{}) interface{} {
	newD, ok := newData.(model.BlockersData)
	if !ok {
		return newData
	}

	oldByID := map[string]model.BlockerItem{}
	if oldJSON != "" {
		var oldD model.BlockersData
		if err := json.Unmarshal([]byte(oldJSON), &oldD); err == nil {
			for _, it := range oldD.Blockers {
				oldByID[it.ID] = it
			}
		}
	}

	for i, item := range newD.Blockers {
		if item.ID == "" || !isKnownBlockerID(item.ID, oldByID) {
			item.ID = computeItemID(item.Title, item.Source, item.Date)
		}
		newD.Blockers[i] = item
	}

	return newD
}

// Type-specific membership helpers (Go generics would simplify, but keeping
// things explicit for clarity).
func isKnownID(id string, m map[string]model.ThingsToRememberItem) bool {
	_, ok := m[id]
	return ok
}
func isKnownSuggestionID(id string, m map[string]model.SuggestionItem) bool {
	_, ok := m[id]
	return ok
}
func isKnownAchievementID(id string, m map[string]model.AchievementItem) bool {
	_, ok := m[id]
	return ok
}
func isKnownBlockerID(id string, m map[string]model.BlockerItem) bool {
	_, ok := m[id]
	return ok
}

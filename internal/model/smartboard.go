package model

import "time"

// SmartBoardPanel represents a cached panel in the database
type SmartBoardPanel struct {
	ID            int       `json:"id"`
	PanelType     string    `json:"panel_type"`
	Data          string    `json:"data"` // JSON blob
	SessionID     string    `json:"session_id"` // OpenCode session ID for reuse
	LastRefreshed time.Time `json:"last_refreshed"`
	CreatedAt     time.Time `json:"created_at"`
}

// ThingsToRememberItem represents a single item in the Things to Remember panel
type ThingsToRememberItem struct {
	ID       string `json:"id"`
	Title    string `json:"title"`    // Short title (max 40 chars)
	Text     string `json:"text"`     // Full description/details
	Category string `json:"category"` // "urgent", "important", "not-important"
	Source   string `json:"source"`
	Date     string `json:"date"`
}

// ThingsToRememberData holds all items for the Things to Remember panel
type ThingsToRememberData struct {
	Items []ThingsToRememberItem `json:"items"`
}

// SuggestionItem represents a single coaching suggestion
type SuggestionItem struct {
	ID         string `json:"id"`
	Title      string `json:"title"`      // Short title (max 40 chars)
	Suggestion string `json:"suggestion"` // Full suggestion text
	Reasoning  string `json:"reasoning"`
	Status     string `json:"status"` // "active", "dismissed", "completed"
	CreatedAt  string `json:"createdAt"`
}

// SuggestionsData holds all suggestions for the Suggestions panel
type SuggestionsData struct {
	Suggestions []SuggestionItem `json:"suggestions"`
}

// AchievementItem represents a single achievement
type AchievementItem struct {
	ID          string `json:"id"`
	Title       string `json:"title"`       // Short title (max 40 chars)
	Achievement string `json:"achievement"` // Full achievement description
	Date        string `json:"date"`
	Source      string `json:"source"`
}

// AchievementsData holds all achievements for the Achievements panel
type AchievementsData struct {
	Achievements []AchievementItem `json:"achievements"`
}

// BlockerItem represents a single blocker
type BlockerItem struct {
	ID      string `json:"id"`
	Title   string `json:"title"`   // Short title (max 40 chars)
	Blocker string `json:"blocker"` // Full blocker description
	Context string `json:"context"`
	Date    string `json:"date"`
	Source  string `json:"source"`
}

// BlockersData holds all blockers for the Blockers panel
type BlockersData struct {
	Blockers []BlockerItem `json:"blockers"`
}

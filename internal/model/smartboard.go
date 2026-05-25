package model

import "time"

// SmartBoardPanel represents a cached panel in the database
type SmartBoardPanel struct {
	ID            int       `json:"id"`
	PanelType     string    `json:"panel_type"`
	Data          string    `json:"data"` // JSON blob
	LastRefreshed time.Time `json:"last_refreshed"`
	CreatedAt     time.Time `json:"created_at"`
}

// ThingsToRememberItem represents a single item in the Things to Remember panel
type ThingsToRememberItem struct {
	ID       string `json:"id"`
	Text     string `json:"text"`
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
	ID        string `json:"id"`
	Suggestion string `json:"suggestion"`
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
	Achievement string `json:"achievement"`
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
	Blocker string `json:"blocker"`
	Context string `json:"context"`
	Date    string `json:"date"`
	Source  string `json:"source"`
}

// BlockersData holds all blockers for the Blockers panel
type BlockersData struct {
	Blockers []BlockerItem `json:"blockers"`
}

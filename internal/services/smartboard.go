package service

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
)

// cacheTTL is how long a cached panel is considered "fresh" before refresh()
// will call the AI again. Users can always bypass with ?force=true.
const cacheTTL = 10 * time.Minute

// SmartBoardService handles business logic for smart board panels
type SmartBoardService struct {
	store            store.SmartBoardStore
	agentChatService *AgentChatService
}

// NewSmartBoardService creates a new smart board service
func NewSmartBoardService(store store.SmartBoardStore, agentChatService *AgentChatService) *SmartBoardService {
	return &SmartBoardService{
		store:            store,
		agentChatService: agentChatService,
	}
}

// RefreshPanel fetches new data from AI and updates cache(db).
// If force is false and the cached panel is younger than cacheTTL, returns
// the cached panel without calling AI (instant, no token cost).
func (s *SmartBoardService) RefreshPanel(panelType string, force bool) (*model.SmartBoardPanel, error) {
	existingPanel, _ := s.store.GetLatestPanel(panelType)

	// Cache hit: have data, recently refreshed, and not forced → skip AI entirely.
	if !force && existingPanel != nil {
		age := time.Since(existingPanel.LastRefreshed)
		if age < cacheTTL {
			fmt.Printf("[smartboard] cache hit for %s (age=%s, ttl=%s)\n",
				panelType, age.Round(time.Second), cacheTTL)
			return existingPanel, nil
		}
	}

	fmt.Printf("[smartboard] cache miss for %s (force=%v)\n", panelType, force)

	// Get AI prompt for this panel type
	// TODO: Prompt should be handled by sidecar later
	prompt, err := s.getPromptForPanel(panelType)
	if err != nil {
		return nil, err
	}

	// Try to reuse existing session for this panel type
	var sessionID *string
	if existingPanel != nil && existingPanel.SessionID != "" {
		sid := existingPanel.SessionID
		sessionID = &sid
	}

	// Call AI via agent chat service (with existing session if available)
	chatResp, err := s.agentChatService.SendAgentChatMessage(AgentChatRequest{
		Message:   prompt,
		SessionID: sessionID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to call AI: %w", err)
	}

	// Parse AI response based on panel type
	data, err := s.parseAIResponse(panelType, chatResp.Response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	// Rewrite item IDs with deterministic content-hashed IDs.
	// This makes the same item produce the same ID across refreshes,
	// enabling future dedupe + merge logic.
	data = rewriteItemIDs(panelType, data)

	// Save to database. SourceFingerprint kept empty for now — reserved for
	// future Option-B style cache key (e.g. MCP-listed file digest).
	if err := s.store.SavePanel(panelType, data, chatResp.SessionID, ""); err != nil {
		return nil, fmt.Errorf("failed to save panel: %w", err)
	}

	return s.store.GetLatestPanel(panelType)
}

// GetCachedPanel retrieves the latest cached panel data
func (s *SmartBoardService) GetCachedPanel(panelType string) (*model.SmartBoardPanel, error) {
	return s.store.GetLatestPanel(panelType)
}

// UpdateItemStatus updates status of a specific item
func (s *SmartBoardService) UpdateItemStatus(panelType, itemID, status string) error {
	return s.store.UpdateItemStatus(panelType, itemID, status)
}

// UpdateItemContent updates content fields of a specific item
func (s *SmartBoardService) UpdateItemContent(panelType, itemID string, fields map[string]string) error {
	return s.store.UpdateItemContent(panelType, itemID, fields)
}

// getPromptForPanel returns the AI prompt for a specific panel type
func (s *SmartBoardService) getPromptForPanel(panelType string) (string, error) {
	// Calculate date ranges
	now := time.Now()
	sevenDaysAgo := now.AddDate(0, 0, -7).Format("2006-01-02")
	threeDaysAgo := now.AddDate(0, 0, -3).Format("2006-01-02")
	weekStart := now.AddDate(0, 0, -int(now.Weekday())).Format("2006-01-02")

	switch panelType {
	case "things-to-remember":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on ~/Documents/resources/work_Elanco/meeting and ~/Documents/resources/work_Elanco/journal to get the CURRENT list of files, then read them.

Analyze all meeting notes and journal entries from the last 7 days (from %s to today).

Your task:
1. Extract action items, TODOs, important decisions, and key takeaways
2. Categorize each item as:
   - urgent: Time-sensitive, requires immediate action, has a deadline
   - important: High priority but not time-critical
   - not-important: Nice to know, context, or low priority

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Short concise title (max 40 chars)",
    "text": "Full description with context and details (max 200 chars)",
    "category": "urgent" | "important" | "not-important",
    "source": "filename where found",
    "date": "YYYY-MM-DD"
  }
]

Rules:
- title: Brief, scannable headline (e.g. "Follow up with Nydia")
- text: Full context/details (e.g. "Follow up with Nydia on business rules/admin access question before June 1 rollout")
- Only include actionable or decision-critical items
- Exclude routine/completed tasks
- Return valid JSON only, no markdown or explanation`, sevenDaysAgo), nil

	case "suggestions":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on ~/Documents/resources/work_Elanco/meeting and ~/Documents/resources/work_Elanco/journal to get the CURRENT list of files, then read them.

Review patterns in my meetings and journal entries from the last 7 days (from %s to today).

Your task:
1. Identify recurring themes, bottlenecks, or missed opportunities
2. Suggest 3-5 actionable improvements (productivity, communication, focus, etc.)
3. Provide brief reasoning for each suggestion

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Short title (max 40 chars)",
    "suggestion": "Full actionable suggestion (max 150 chars)",
    "reasoning": "Why this matters and what pattern you observed (max 200 chars)"
  }
]

Focus on:
- Time management patterns
- Communication effectiveness
- Meeting quality
- Work-life balance signals
- Productivity blockers

Return valid JSON only, no markdown or explanation.`, sevenDaysAgo), nil

	case "achievements":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on ~/Documents/resources/work_Elanco/journal to get the CURRENT list of files, then read them.

Scan this week's journal entries (from %s to today) for accomplishments, completed tasks, and wins.

Your task:
1. Extract completed work items, project milestones, positive outcomes
2. Focus on tangible achievements (shipped features, solved problems, etc.)
3. Ignore routine tasks unless significant

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Short title (max 40 chars)",
    "achievement": "Full achievement description (max 200 chars)",
    "date": "YYYY-MM-DD",
    "source": "filename"
  }
]

Rules:
- title: Brief headline (e.g. "Shipped SSO auth")
- achievement: Full details (e.g. "Implemented and shipped SSO authentication for the platform")
- Only include meaningful accomplishments
- Sort by date (newest first)

Return valid JSON only, no markdown or explanation.`, weekStart), nil

	case "blockers":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on ~/Documents/resources/work_Elanco/meeting and ~/Documents/resources/work_Elanco/journal to get the CURRENT list of files, then read them.

Identify current blockers, challenges, or stuck items from the last 3 days (from %s to today).

Your task:
1. Find explicit mentions of blockers, waiting situations, or frustrations
2. Extract the blocker and surrounding context
3. Focus on unresolved issues

Return ONLY a JSON array with this exact structure:
[
  {
    "title": "Short title (max 40 chars)",
    "blocker": "Full blocker description (max 150 chars)",
    "context": "Additional details or who/what is involved (max 200 chars)",
    "date": "YYYY-MM-DD",
    "source": "filename"
  }
]

Look for phrases like:
- "blocked by", "waiting on", "stuck on"
- "can't proceed", "need help with"
- "issue with", "problem with"

Return valid JSON only, no markdown or explanation.`, threeDaysAgo), nil

	default:
		return "", fmt.Errorf("unknown panel type: %s", panelType)
	}
}

// parseAIResponse parses the AI response into the appropriate data structure
func (s *SmartBoardService) parseAIResponse(panelType, response string) (interface{}, error) {
	// Clean markdown code blocks if present
	response = cleanJSONResponse(response)

	switch panelType {
	case "things-to-remember":
		var items []model.ThingsToRememberItem
		if err := json.Unmarshal([]byte(response), &items); err != nil {
			// TODO: A better way to handle passing of response i case
			// we dont get the response extact howwe want it from ai

			// INFO: We also need to be able to view the response so it needs to be
			// saved for review so we can correct the ai on where it made mistake
			return nil, fmt.Errorf("failed to parse things-to-remember response: %w", err)
		}
		// Add IDs to items(response)
		// TODO: Make sure its UUID
		for i := range items {
			items[i].ID = generateID()
		}
		return model.ThingsToRememberData{Items: items}, nil

	case "suggestions":
		var suggestions []model.SuggestionItem
		if err := json.Unmarshal([]byte(response), &suggestions); err != nil {
			return nil, fmt.Errorf("failed to parse suggestions response: %w", err)
		}
		// Add IDs and default status
		now := time.Now().Format(time.RFC3339)
		for i := range suggestions {
			suggestions[i].ID = generateID()
			suggestions[i].Status = "active"
			suggestions[i].CreatedAt = now
		}
		return model.SuggestionsData{Suggestions: suggestions}, nil

	case "achievements":
		var achievements []model.AchievementItem
		if err := json.Unmarshal([]byte(response), &achievements); err != nil {
			return nil, fmt.Errorf("failed to parse achievements response: %w", err)
		}
		// Add IDs
		for i := range achievements {
			achievements[i].ID = generateID()
		}
		return model.AchievementsData{Achievements: achievements}, nil

	case "blockers":
		var blockers []model.BlockerItem
		if err := json.Unmarshal([]byte(response), &blockers); err != nil {
			return nil, fmt.Errorf("failed to parse blockers response: %w", err)
		}
		// Add IDs
		for i := range blockers {
			blockers[i].ID = generateID()
		}
		return model.BlockersData{Blockers: blockers}, nil

	default:
		return nil, fmt.Errorf("unknown panel type: %s", panelType)
	}
}

// cleanJSONResponse removes markdown code blocks and extracts JSON from response
func cleanJSONResponse(response string) string {
	// First trim whitespace
	response = strings.TrimSpace(response)

	// Remove markdown code blocks if present
	if strings.HasPrefix(response, "```json") {
		response = strings.TrimPrefix(response, "```json")
	}
	if strings.HasPrefix(response, "```") {
		response = strings.TrimPrefix(response, "```")
	}
	if strings.HasSuffix(response, "```") {
		response = strings.TrimSuffix(response, "```")
	}

	// Trim again after removing code blocks
	response = strings.TrimSpace(response)

	// Find first '[' or '{' (start of JSON)
	startIdx := -1
	for i, ch := range response {
		if ch == '[' || ch == '{' {
			startIdx = i
			break
		}
	}

	// Find last ']' or '}' (end of JSON)
	endIdx := -1
	for i := len(response) - 1; i >= 0; i-- {
		if response[i] == ']' || response[i] == '}' {
			endIdx = i + 1
			break
		}
	}

	// Extract JSON if found
	if startIdx != -1 && endIdx != -1 && startIdx < endIdx {
		return strings.TrimSpace(response[startIdx:endIdx])
	}

	// Return original if no JSON markers found
	return response
}

// generateID generates a random ID for items
func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

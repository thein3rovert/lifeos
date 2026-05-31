package service

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/thein3rovert/lifeos/internal/model"
	"github.com/thein3rovert/lifeos/internal/store"
)

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

// RefreshPanel fetches new data from AI and updates cache(db)
func (s *SmartBoardService) RefreshPanel(panelType string) (*model.SmartBoardPanel, error) {
	// Get AI prompt for this panel type
	// TODO: Prompt should be handled by sidecar later
	prompt, err := s.getPromptForPanel(panelType)
	if err != nil {
		return nil, err
	}

	// Call AI via agent chat service
	chatResp, err := s.agentChatService.SendAgentChatMessage(AgentChatRequest{
		Message: prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to call AI: %w", err)
	}

	// Parse AI response based on panel type
	data, err := s.parseAIResponse(panelType, chatResp.Response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	// Save to database
	if err := s.store.SavePanel(panelType, data); err != nil {
		return nil, fmt.Errorf("failed to save panel: %w", err)
	}

	// Return the saved panel
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

// getPromptForPanel returns the AI prompt for a specific panel type
func (s *SmartBoardService) getPromptForPanel(panelType string) (string, error) {
	// Calculate date ranges
	now := time.Now()
	sevenDaysAgo := now.AddDate(0, 0, -7).Format("2006-01-02")
	threeDaysAgo := now.AddDate(0, 0, -3).Format("2006-01-02")
	weekStart := now.AddDate(0, 0, -int(now.Weekday())).Format("2006-01-02")

	switch panelType {
	case "things-to-remember":
		return fmt.Sprintf(`Analyze all meeting notes and journal entries from the last 7 days (from %s to today).

Your task:
1. Extract action items, TODOs, important decisions, and key takeaways
2. Categorize each item as:
   - urgent: Time-sensitive, requires immediate action, has a deadline
   - important: High priority but not time-critical
   - not-important: Nice to know, context, or low priority

Return ONLY a JSON array with this exact structure:
[
  {
    "text": "Brief description of the item",
    "category": "urgent" | "important" | "not-important",
    "source": "filename where found",
    "date": "YYYY-MM-DD"
  }
]

Rules:
- Be concise (max 80 chars per item)
- Only include actionable or decision-critical items
- Exclude routine/completed tasks
- Return valid JSON only, no markdown or explanation`, sevenDaysAgo), nil

	case "suggestions":
		return fmt.Sprintf(`Review patterns in my meetings and journal entries from the last 7 days (from %s to today).

Your task:
1. Identify recurring themes, bottlenecks, or missed opportunities
2. Suggest 3-5 actionable improvements (productivity, communication, focus, etc.)
3. Provide brief reasoning for each suggestion

Return ONLY a JSON array with this exact structure:
[
  {
    "suggestion": "Clear, actionable suggestion (max 100 chars)",
    "reasoning": "Why this matters and what pattern you observed (max 150 chars)"
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
		return fmt.Sprintf(`Scan this week's journal entries (from %s to today) for accomplishments, completed tasks, and wins.

Your task:
1. Extract completed work items, project milestones, positive outcomes
2. Focus on tangible achievements (shipped features, solved problems, etc.)
3. Ignore routine tasks unless significant

Return ONLY a JSON array with this exact structure:
[
  {
    "achievement": "Brief description (max 120 chars)",
    "date": "YYYY-MM-DD",
    "source": "filename"
  }
]

Rules:
- Only include meaningful accomplishments
- Keep descriptions specific and factual
- Sort by date (newest first)

Return valid JSON only, no markdown or explanation.`, weekStart), nil

	case "blockers":
		return fmt.Sprintf(`Identify current blockers, challenges, or stuck items from the last 3 days (from %s to today).

Your task:
1. Find explicit mentions of blockers, waiting situations, or frustrations
2. Extract the blocker and surrounding context
3. Focus on unresolved issues

Return ONLY a JSON array with this exact structure:
[
  {
    "blocker": "What is blocked or challenging (max 100 chars)",
    "context": "Additional details or who/what is involved (max 120 chars)",
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

// cleanJSONResponse removes markdown code blocks from response
func cleanJSONResponse(response string) string {
	// Remove ```json and ``` markers (check regardless if exist)
	if len(response) > 7 && response[:7] == "```json" {
		response = response[7:]
	}
	if len(response) > 3 && response[len(response)-3:] == "```" {
		response = response[:len(response)-3]
	}
	// Trim whitespace
	return response[0:len(response)]
}

// generateID generates a random ID for items
func generateID() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)
}

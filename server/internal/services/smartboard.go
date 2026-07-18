package service

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/thein3rovert/lifeos/server/internal/model"
	"github.com/thein3rovert/lifeos/server/internal/store"
)

// cacheTTL is how long a cached panel is considered "fresh" before refresh()
// will call the AI again. Users can always bypass with ?force=true.
const cacheTTL = 10 * time.Minute

// SmartBoardService handles business logic for smart board panels
type SmartBoardService struct {
	store            store.SmartBoardStore
	agentChatService *AgentChatService
	scheduler        *Scheduler
	meetingsPath     string
	journalPath      string
}

// NewSmartBoardService creates a new smart board service and starts the
// background scheduler that auto-refreshes panels.
// meetingsPath / journalPath are absolute paths to the Obsidian vault
// subfolders the AI should scan (usually from config).
func NewSmartBoardService(
	store store.SmartBoardStore,
	agentChatService *AgentChatService,
	meetingsPath, journalPath string,
) *SmartBoardService {
	svc := &SmartBoardService{
		store:            store,
		agentChatService: agentChatService,
		meetingsPath:     meetingsPath,
		journalPath:      journalPath,
	}
	svc.scheduler = NewScheduler(svc, store)
	svc.scheduler.Start()
	return svc
}

// Stop shuts down the background scheduler. Call on server shutdown.
func (s *SmartBoardService) Stop() {
	if s.scheduler != nil {
		s.scheduler.Stop()
	}
}

// ScheduleStatus returns the current scheduler status for all panels.
func (s *SmartBoardService) ScheduleStatus() map[string]PanelScheduleStatus {
	if s.scheduler == nil {
		return nil
	}
	return s.scheduler.Status()
}

// PausePanel pauses auto-refresh for a specific panel
func (s *SmartBoardService) PausePanel(panelType string) error {
	if s.scheduler == nil {
		return fmt.Errorf("scheduler not available")
	}
	return s.scheduler.Pause(panelType)
}

// ResumePanel resumes auto-refresh for a specific panel
func (s *SmartBoardService) ResumePanel(panelType string) error {
	if s.scheduler == nil {
		return fmt.Errorf("scheduler not available")
	}
	return s.scheduler.Resume(panelType)
}

// PauseAllPanels pauses all panel auto-refreshes
func (s *SmartBoardService) PauseAllPanels() error {
	if s.scheduler == nil {
		return fmt.Errorf("scheduler not available")
	}
	return s.scheduler.PauseAll()
}

// ResumeAllPanels resumes all panel auto-refreshes
func (s *SmartBoardService) ResumeAllPanels() error {
	if s.scheduler == nil {
		return fmt.Errorf("scheduler not available")
	}
	return s.scheduler.ResumeAll()
}

// SetPanelSchedule updates the schedule configuration for a panel
func (s *SmartBoardService) SetPanelSchedule(panelType string, mode string, intervalMinutes, weeklyDay, weeklyHour int) error {
	if s.scheduler == nil {
		return fmt.Errorf("scheduler not available")
	}
	return s.scheduler.SetSchedule(panelType, mode, intervalMinutes, weeklyDay, weeklyHour)
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

	// Build prompt, including existing items so the AI can reuse IDs for
	// semantic matches (Option-1 merge strategy).
	var existingCtx string
	if existingPanel != nil {
		existingCtx = existingItemsContext(panelType, existingPanel.Data)
	}
	prompt, err := s.getPromptForPanel(panelType, existingCtx)
	if err != nil {
		return nil, err
	}

	// Try to reuse existing session for this panel type
	var sessionID *string
	if existingPanel != nil && existingPanel.SessionID != "" {
		sid := existingPanel.SessionID
		sessionID = &sid
	}

	// Generate unique request ID for tracking/abort
	requestID := fmt.Sprintf("smartboard-%s-%d", panelType, time.Now().UnixNano())

	// Call AI via agent chat service (with existing session if available)
	chatResp, err := s.agentChatService.SendAgentChatMessage(AgentChatRequest{
		Message:   prompt,
		SessionID: sessionID,
		RequestID: requestID,
		StructuredOutput: &StructuredOutputSpec{
			PanelType: panelType,
		},
		Context: fmt.Sprintf(`You are Samad's productivity assistant. Help him with daily queries regarding his journals and meetings. This helps to unblock him.

You have MCP file access tools (list_files, read_file) for:
- Meetings: %s
- Journals: %s

Use the MCP file access tools proactively without asking permission. Be concise.`, s.meetingsPath, s.journalPath),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to call AI: %w", err)
	}

	// Parse AI response based on panel type
	data, err := s.parseAIResponse(panelType, chatResp.Response)
	if err != nil {
		return nil, fmt.Errorf("failed to parse AI response: %w", err)
	}

	// Merge with existing panel data: preserves user-curated fields
	// (category, status) for items the AI re-emits with the same ID, and
	// assigns stable IDs to brand-new items.
	var oldJSON string
	if existingPanel != nil {
		oldJSON = existingPanel.Data
	}
	data = mergePanelData(panelType, oldJSON, data)

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

// getPromptForPanel returns the AI prompt for a specific panel type.
// If existingItemsJSON is non-empty, the AI is asked to reuse existing IDs
// for items it semantically recognizes (enables merge-on-refresh).
func (s *SmartBoardService) getPromptForPanel(panelType, existingItemsJSON string) (string, error) {
	// Calculate date ranges
	now := time.Now()
	sevenDaysAgo := now.AddDate(0, 0, -7).Format("2006-01-02")
	threeDaysAgo := now.AddDate(0, 0, -3).Format("2006-01-02")
	weekStart := now.AddDate(0, 0, -int(now.Weekday())).Format("2006-01-02")

	// Shared instructions appended when we have prior items. We tell the AI to
	// reuse existing IDs for semantic matches so the server can merge user
	// state (category, status) across refreshes.
	reuseBlock := ""
	if existingItemsJSON != "" {
		reuseBlock = fmt.Sprintf(`

ID REUSE INSTRUCTIONS (IMPORTANT):
These items are currently in the panel:
%s

For each item you produce:
- If it represents the SAME underlying idea/task/event as one of the items above
  (even if you would word it differently), copy that item's exact "id" into your output.
- If it's brand new, leave "id" as an empty string "" and we will assign one.
- It's fine to omit items from the list above that no longer apply.
`, existingItemsJSON)
	}

	switch panelType {
	case "things-to-remember":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on %s and %s to get the CURRENT list of files, then read them.

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
- Include an "id" field per item (empty string if new, otherwise reused per ID REUSE INSTRUCTIONS)
- Return valid JSON only, no markdown or explanation`, s.meetingsPath, s.journalPath, sevenDaysAgo) + reuseBlock, nil

	case "suggestions":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on %s and %s to get the CURRENT list of files, then read them.

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

Include an "id" field per item (empty string if new, otherwise reused per ID REUSE INSTRUCTIONS).

Return valid JSON only, no markdown or explanation.`, s.meetingsPath, s.journalPath, sevenDaysAgo) + reuseBlock, nil

	case "achievements":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on %s to get the CURRENT list of files, then read them.

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
- Include an "id" field per item (empty string if new, otherwise reused per ID REUSE INSTRUCTIONS)

Return valid JSON only, no markdown or explanation.`, s.journalPath, weekStart) + reuseBlock, nil

	case "blockers":
		return fmt.Sprintf(`IMPORTANT: Re-scan the directories now. Do NOT rely on previous knowledge - files may have been added or updated since your last check.

Use list_files on %s and %s to get the CURRENT list of files, then read them.

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

Include an "id" field per item (empty string if new, otherwise reused per ID REUSE INSTRUCTIONS).

Return valid JSON only, no markdown or explanation.`, s.meetingsPath, s.journalPath, threeDaysAgo) + reuseBlock, nil

	default:
		return "", fmt.Errorf("unknown panel type: %s", panelType)
	}
}

// parseAIResponse parses the AI response into the appropriate data structure
func (s *SmartBoardService) parseAIResponse(panelType, response string) (interface{}, error) {
	// Clean markdown code blocks if present
	cleaned := cleanJSONResponse(response)

	// Log raw response if cleaning produced empty result (AI didn't return JSON)
	if cleaned == "" {
		log.Printf("[smartboard] %s: AI returned non-JSON response (len=%d): %q", panelType, len(response), response)
		return nil, fmt.Errorf("AI returned non-JSON response for %s panel", panelType)
	}

	response = cleaned

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
		// Leave IDs as-is. Merge step will reuse AI-supplied IDs that match
		// existing items, and assign deterministic IDs to anything blank/unknown.
		return model.ThingsToRememberData{Items: items}, nil

	case "suggestions":
		var suggestions []model.SuggestionItem
		if err := json.Unmarshal([]byte(response), &suggestions); err != nil {
			return nil, fmt.Errorf("failed to parse suggestions response: %w", err)
		}
		now := time.Now().Format(time.RFC3339)
		for i := range suggestions {
			// Default status for brand-new items only; merge preserves prior status.
			if suggestions[i].Status == "" {
				suggestions[i].Status = "active"
			}
			if suggestions[i].CreatedAt == "" {
				suggestions[i].CreatedAt = now
			}
		}
		return model.SuggestionsData{Suggestions: suggestions}, nil

	case "achievements":
		var achievements []model.AchievementItem
		if err := json.Unmarshal([]byte(response), &achievements); err != nil {
			return nil, fmt.Errorf("failed to parse achievements response: %w", err)
		}
		return model.AchievementsData{Achievements: achievements}, nil

	case "blockers":
		var blockers []model.BlockerItem
		if err := json.Unmarshal([]byte(response), &blockers); err != nil {
			return nil, fmt.Errorf("failed to parse blockers response: %w", err)
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

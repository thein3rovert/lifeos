# Smart Board Feature Plan

## Overview

Transform the Agent page into a Smart Board - an AI-powered dashboard that analyzes Obsidian vault journals and meetings to provide actionable insights, achievements tracking, coaching suggestions, and blocker identification.

## Data Source

**OpenCode Sidecar with MCP File Access**
- Meetings: `~/Documents/resources/work_Elanco/meeting`
- Journals: `~/Documents/resources/work_Elanco/journal`
- Access via existing `/api/agent/chat` endpoint with MCP tools (`list_files`, `read_file`)

## Architecture

### Tech Stack
- **Backend**: Go 1.26 with SQLite for caching
- **Frontend**: TanStack Start (React + TypeScript)
- **AI**: OpenCode Sidecar (Node.js + Express on port 3001)
- **Styling**: Tailwind CSS v4 + Atlas design system

### Component Structure
```
web/src/
  components/
    agent/
      AgentChatPage.tsx           # Existing (rename to AgentSmartBoard.tsx)
      SmartBoardPanel.tsx         # Reusable panel component
      ThingsToRememberPanel.tsx   # Left top panel
      SuggestionsPanel.tsx        # Center panel
      AchievementsPanel.tsx       # Right top panel
      BlockersPanel.tsx           # Right bottom panel
      CanvasEditor.tsx            # Expandable markdown editor
  routes/
    agent/
      index.tsx                   # Main Smart Board route
```

## Database Schema

### New Table: `smartboard_panels`

```sql
CREATE TABLE IF NOT EXISTS smartboard_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_type TEXT NOT NULL CHECK(panel_type IN (
        'things-to-remember',
        'suggestions',
        'achievements',
        'blockers'
    )),
    data TEXT NOT NULL,              -- JSON blob for panel-specific data
    last_refreshed DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smartboard_panels_type_refresh 
    ON smartboard_panels(panel_type, last_refreshed DESC);
```

### Data Structure Per Panel

```typescript
// Things To Remember
type ThingsToRememberData = {
  items: Array<{
    id: string;
    text: string;
    category: 'urgent' | 'important' | 'not-important';
    source: string;  // e.g., "meeting-2026-05-20.md"
    date: string;
  }>;
}

// Suggestions/Coach
type SuggestionsData = {
  suggestions: Array<{
    id: string;
    suggestion: string;
    reasoning: string;
    status: 'active' | 'dismissed' | 'completed';
    createdAt: string;
  }>;
}

// Achievements
type AchievementsData = {
  achievements: Array<{
    id: string;
    achievement: string;
    date: string;
    source: string;
  }>;
}

// Blockers
type BlockersData = {
  blockers: Array<{
    id: string;
    blocker: string;
    context: string;
    date: string;
    source: string;
  }>;
}
```

## API Endpoints

### Backend (Go)

```
POST   /api/smartboard/refresh/:panelType    # Refresh specific panel
GET    /api/smartboard/:panelType            # Get cached panel data
PATCH  /api/smartboard/item/:itemId          # Update item status (for suggestions)
DELETE /api/smartboard/item/:itemId          # Delete item (soft delete)
```

### Panel Types
- `things-to-remember`
- `suggestions`
- `achievements`
- `blockers`

## AI Prompts (via Sidecar)

Each panel refresh sends a specific prompt to OpenCode via the sidecar.

### 1. Things To Remember (Last 7 Days)

```typescript
const prompt = `
Analyze all meeting notes and journal entries from the last 7 days.

Your task:
1. Extract action items, TODOs, important decisions, and key takeaways
2. Categorize each item as:
   - URGENT: Time-sensitive, requires immediate action, has a deadline
   - IMPORTANT: High priority but not time-critical
   - NOT IMPORTANT: Nice to know, context, or low priority

Return ONLY a JSON array with this exact structure:
[
  {
    "text": "Brief description of the item",
    "category": "urgent" | "important" | "not-important",
    "source": "filename where found"
  }
]

Rules:
- Be concise (max 80 chars per item)
- Only include actionable or decision-critical items
- Exclude routine/completed tasks
- Return valid JSON only, no markdown or explanation
`;
```

### 2. Suggestions/Coach (Last 7 Days)

```typescript
const prompt = `
Review patterns in my meetings and journal entries from the last 7 days.

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

Return valid JSON only, no markdown or explanation.
`;
```

### 3. Weekly Achievements (Current Week)

```typescript
const prompt = `
Scan this week's journal entries for accomplishments, completed tasks, and wins.

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

Return valid JSON only, no markdown or explanation.
`;
```

### 4. Blockers (Last 3 Days)

```typescript
const prompt = `
Identify current blockers, challenges, or stuck items from the last 3 days.

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

Return valid JSON only, no markdown or explanation.
`;
```

## Service Layer (Go)

### File Structure

```
internal/
  api/
    smartboard/
      smartboard.go              # HTTP handlers
  services/
    smartboard_service.go        # Business logic
  store/
    smartboard_store.go          # Database operations
  model/
    smartboard.go                # Data structs
```

### Handler Methods

```go
// internal/api/smartboard/smartboard.go

type SmartBoardHandler struct {
    service *service.SmartBoardService
}

// POST /api/smartboard/refresh/:panelType
func (h *SmartBoardHandler) RefreshPanel(w http.ResponseWriter, r *http.Request)

// GET /api/smartboard/:panelType
func (h *SmartBoardHandler) GetPanel(w http.ResponseWriter, r *http.Request)

// PATCH /api/smartboard/item/:itemId
func (h *SmartBoardHandler) UpdateItemStatus(w http.ResponseWriter, r *http.Request)
```

### Service Methods

```go
// internal/services/smartboard_service.go

type SmartBoardService struct {
    agentChatService *AgentChatService
    store            store.SmartBoardStore
}

// RefreshPanel fetches new data from AI and updates cache
func (s *SmartBoardService) RefreshPanel(panelType string) (PanelData, error)

// GetCachedPanel retrieves the latest cached panel data
func (s *SmartBoardService) GetCachedPanel(panelType string) (PanelData, error)

// UpdateItemStatus updates status of suggestion items
func (s *SmartBoardService) UpdateItemStatus(itemID string, status string) error
```

### Store Methods

```go
// internal/store/smartboard_store.go

type SmartBoardStore interface {
    SavePanel(panelType string, data string) error
    GetLatestPanel(panelType string) (*model.SmartBoardPanel, error)
    UpdateItemStatus(panelType, itemID, status string) error
}

type SQLSmartBoardStore struct {
    db *sql.DB
}
```

## Frontend Components

### 1. Main Layout (AgentSmartBoard.tsx)

```typescript
export default function AgentSmartBoard() {
  return (
    <div className="min-h-screen bg-primary">
      {/* Header with refresh controls */}
      <div className="border-b border-default bg-secondary">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-lg font-medium text-primary">Smart Board</h1>
        </div>
      </div>

      {/* Main grid layout */}
      <div className="container mx-auto px-6 py-6 space-y-4">
        {/* Top row */}
        <div className="grid grid-cols-3 gap-4">
          <ThingsToRememberPanel />
          <SuggestionsPanel />
          <AchievementsPanel />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            {/* Canvas Editor - only visible when editing */}
            <CanvasEditor />
          </div>
          <BlockersPanel />
        </div>
      </div>

      {/* Floating chat input (existing) */}
      <FloatingChatInput />
    </div>
  )
}
```

### 2. Reusable Panel Component (SmartBoardPanel.tsx)

```typescript
type SmartBoardPanelProps = {
  title: string;
  loading: boolean;
  lastRefreshed: Date | null;
  onRefresh: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SmartBoardPanel({ 
  title, 
  loading, 
  lastRefreshed, 
  onRefresh,
  children,
  className 
}: SmartBoardPanelProps) {
  return (
    <div className={cn("bg-secondary border border-default rounded-lg", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-default flex items-center justify-between">
        <h2 className="text-sm font-medium text-primary">{title}</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1 hover:bg-tertiary rounded-md transition-colors"
        >
          <RefreshCw className={cn(
            "w-3.5 h-3.5 text-secondary",
            loading && "animate-spin"
          )} strokeWidth={1.5} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <SkeletonCard />
        ) : (
          children
        )}
      </div>

      {/* Footer - timestamp */}
      {lastRefreshed && (
        <div className="px-4 py-2 border-t border-default">
          <span className="text-xs text-tertiary">
            Updated {formatRelativeTime(lastRefreshed)}
          </span>
        </div>
      )}
    </div>
  )
}
```

### 3. Things To Remember Panel

```typescript
export function ThingsToRememberPanel() {
  const { data, loading, lastRefreshed, refresh } = useSmartBoardPanel('things-to-remember')

  const urgent = data?.items.filter(i => i.category === 'urgent') || []
  const important = data?.items.filter(i => i.category === 'important') || []
  const notImportant = data?.items.filter(i => i.category === 'not-important') || []

  return (
    <SmartBoardPanel
      title="Things to Remember"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={refresh}
      className="row-span-2"
    >
      <div className="space-y-4">
        {/* Urgent */}
        {urgent.length > 0 && (
          <CategorySection title="Urgent" items={urgent} color="red" />
        )}
        
        {/* Important */}
        {important.length > 0 && (
          <CategorySection title="Important" items={important} color="yellow" />
        )}
        
        {/* Not Important */}
        {notImportant.length > 0 && (
          <CategorySection title="Not Important" items={notImportant} color="gray" />
        )}
      </div>
    </SmartBoardPanel>
  )
}
```

### 4. Canvas Editor (CanvasEditor.tsx)

Markdown editor that opens when user clicks "Edit" on any card item.

```typescript
type CanvasEditorProps = {
  isOpen: boolean;
  initialContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export function CanvasEditor({ isOpen, initialContent, onSave, onClose }: CanvasEditorProps) {
  const [content, setContent] = useState(initialContent)

  if (!isOpen) return null

  return (
    <div className="bg-secondary border border-default rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-primary">Edit Content</h3>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button onClick={() => onSave(content)} className="btn-primary btn-sm">
            Save Changes
          </button>
        </div>
      </div>

      {/* Markdown Editor */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-64 bg-tertiary border border-default rounded-md px-3 py-2 text-sm text-primary font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="Edit content in Markdown..."
      />

      {/* Preview */}
      <div className="mt-4 border-t border-default pt-4">
        <h4 className="text-xs text-secondary mb-2">Preview</h4>
        <RenderMarkdown content={content} />
      </div>
    </div>
  )
}
```

## Custom Hook

### useSmartBoardPanel.ts

```typescript
export function useSmartBoardPanel(panelType: PanelType) {
  const [data, setData] = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Fetch cached data on mount
  useEffect(() => {
    fetchCachedData()
  }, [panelType])

  const fetchCachedData = async () => {
    try {
      const result = await api.smartboard.getPanel(panelType)
      setData(result.data)
      setLastRefreshed(new Date(result.lastRefreshed))
    } catch (error) {
      console.error('Failed to fetch panel:', error)
    }
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const result = await api.smartboard.refreshPanel(panelType)
      setData(result.data)
      setLastRefreshed(new Date())
      toast('Panel updated', 'success')
    } catch (error) {
      toast('Failed to refresh panel', 'error')
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, lastRefreshed, refresh }
}
```

## API Client Extensions

### lib/api.ts

```typescript
export const api = {
  // ... existing methods ...
  
  smartboard: {
    async getPanel(panelType: PanelType) {
      const res = await fetch(`${API_URL}/api/smartboard/${panelType}`)
      if (!res.ok) throw new Error('Failed to fetch panel')
      return res.json()
    },

    async refreshPanel(panelType: PanelType) {
      const res = await fetch(`${API_URL}/api/smartboard/refresh/${panelType}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to refresh panel')
      return res.json()
    },

    async updateItemStatus(itemId: string, status: string) {
      const res = await fetch(`${API_URL}/api/smartboard/item/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update item')
      return res.json()
    },
  }
}
```

## Implementation Phases

### Phase 1: Backend Foundation
1. Create database schema and migrations
2. Implement store layer (`SmartBoardStore`)
3. Implement service layer (`SmartBoardService`)
4. Create API handlers
5. Wire up routes in `cmd/server/main.go`
6. Test with Postman/curl

**Files to create:**
- `internal/model/smartboard.go`
- `internal/store/smartboard_store.go`
- `internal/services/smartboard_service.go`
- `internal/api/smartboard/smartboard.go`

### Phase 2: Frontend Components
1. Create reusable `SmartBoardPanel` component
2. Implement panel-specific components
3. Create `useSmartBoardPanel` hook
4. Build `CanvasEditor` component
5. Update API client with smartboard methods

**Files to create:**
- `web/src/components/agent/SmartBoardPanel.tsx`
- `web/src/components/agent/ThingsToRememberPanel.tsx`
- `web/src/components/agent/SuggestionsPanel.tsx`
- `web/src/components/agent/AchievementsPanel.tsx`
- `web/src/components/agent/BlockersPanel.tsx`
- `web/src/components/agent/CanvasEditor.tsx`
- `web/src/hooks/useSmartBoardPanel.ts`

### Phase 3: Layout Integration
1. Rename `AgentChatPage.tsx` to `AgentSmartBoard.tsx`
2. Implement grid layout
3. Integrate floating chat (existing)
4. Add loading states and error handling
5. Polish animations and transitions

### Phase 4: AI Integration
1. Test prompts with real Obsidian data
2. Refine prompts based on results
3. Handle edge cases (empty data, malformed JSON)
4. Add retry logic for failed AI calls

### Phase 5: Polish & Features
1. Add item editing via canvas
2. Implement status changes for suggestions
3. Add manual item deletion
4. Implement "Run Daily" and "Run Weekly" automation triggers
5. Add keyboard shortcuts
6. Performance optimization

## Atlas Design System Compliance

- **Colors**: Black canvas (#000), gray surfaces, near-white actions
- **Spacing**: 4px grid (`space-*` tokens)
- **Borders**: Use borders over shadows
- **Radii**: 4px for panels, 6px for buttons
- **Icons**: Lucide React with 1.5px stroke
- **Typography**: 13px base, 12px for secondary text
- **Loading**: Skeleton components with shimmer effect
- **Transitions**: 200ms ease-in-out for hover states

## Testing Strategy

### Manual Testing Checklist
- [ ] Each panel loads cached data on mount
- [ ] Manual refresh triggers AI analysis
- [ ] Loading states show skeleton
- [ ] Error states show toast notifications
- [ ] Canvas editor opens/closes correctly
- [ ] Markdown preview renders correctly
- [ ] Status changes update immediately
- [ ] Timestamps show relative time
- [ ] Floating chat remains functional
- [ ] Layout responsive at different viewport sizes

### Edge Cases
- Empty vault (no files)
- Malformed markdown files
- AI returns invalid JSON
- Network timeout during refresh
- Concurrent refresh requests
- Very long item text (truncation)

## Performance Considerations

1. **Caching**: Always serve cached data first, refresh in background
2. **Debouncing**: Prevent rapid refresh button clicks (500ms debounce)
3. **Lazy Loading**: Load panels independently (don't block on one panel's failure)
4. **Memoization**: Use `React.memo` for panel items
5. **Optimistic Updates**: Update UI immediately, rollback on failure

## Future Enhancements (Out of Scope for v1)

- [ ] Daily/weekly auto-refresh schedule
- [ ] Export panel data as markdown
- [ ] Search within panel items
- [ ] Filter/sort items
- [ ] Link items to source files (click to open in Obsidian)
- [ ] Trend visualization (achievements over time)
- [ ] Custom panel configuration
- [ ] Multi-user support

## Open Questions

1. **Should we cache AI responses for longer?** (Currently per-request)
2. **Should manual edits sync back to Obsidian?** (Currently UI-only)
3. **What happens if AI analysis takes >2min?** (Timeout handling)
4. **Should we show loading progress?** (e.g., "Analyzing 42 files...")

## Success Metrics

- User refreshes at least 1 panel per day
- Average refresh completes in <30 seconds
- 90% of AI responses parse successfully
- Zero UI crashes/errors in production
- Users report actionable insights from panels

---

**Ready to implement?** Start with Phase 1 (Backend Foundation).

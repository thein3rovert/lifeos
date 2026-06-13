## Agent Page - Smart Board Feature

The agent page (which will be renamed) have a chat interface that is connected to opencode and the mcp created for it that has access a scope and limited dir in my obsidian vault.

But this page except for the chat interface is currently blank and has nothing in it but i have an idea of what i want it to be..a SMART BOARD..where i can see more ai summary and details about my vault and all.

- [x] I need to make sure some of the description is visible on the cards
- [ ] If the recent output is [] just show the cache output in the db and have a way to show its not the latest output
- [x] I need to convert the catagory on the card to tags instead and have them below like linear
- [x] I need to preview card below to show the preview mode first instead of edit mode and i need the save to work.
- [ ] Add the ability to pause/disable the timer on each panel
  - [ ] Maybe also add it in settings
- [ ] Add notification (discord/telegram)
- [ ] i need a better way to integrate the agent chat below with each of these days
  - [ ] It need to have context of each card and also knowledge base in case it wants to go deeper into what the context board gives.


### Plan: `/doc/smartboard-plan.md`

### Implementation Progress

#### Phase 1: Backend Foundation ✅ COMMITTED
- [x] 1.1 Database schema - Add migration to sqlite.go
- [x] 1.2 Model - Create internal/model/smartboard.go
- [x] 1.3 Store - Create internal/store/smartboard.go
- [x] 1.4 Service - Create internal/services/smartboard.go
- [x] 1.5 Handlers - Create internal/api/smartboard/smartboard.go
- [x] 1.6 Routes - Wire up in cmd/server/main.go

#### Phase 2: Frontend Components
- [x] 2.1 Create reusable SmartBoardPanel component
- [x] 2.2 Implement panel-specific components (ThingsToRemember, Suggestions, Achievements, Blockers)
- [x] 2.3 Create useSmartBoardPanel hook
- [x] 2.4 Build CanvasEditor component
- [x] 2.5 Update API client with smartboard methods

#### Phase 3: Layout Integration
- [x] 3.1 Create new AgentSmartBoard page with grid layout
- [x] 3.2 Wire up all panels with hooks and state management
- [x] 3.3 Integrate CanvasEditor with edit functionality
- [x] 3.4 Extract and integrate FloatingChat component
- [x] 3.5 Update route to use new AgentSmartBoard page

#### Phase 4: AI Integration
- [ ] 4.1 Test prompts with real Obsidian data
- [ ] 4.2 Refine prompts based on results
- [ ] 4.3 Handle edge cases (empty data, malformed JSON)
- [ ] 4.4 Add retry logic for failed AI calls

#### Phase 5: Polish & Features
- [ ] 5.1 Add item editing via canvas
- [ ] 5.2 Implement status changes for suggestions
- [ ] 5.3 Add manual item deletion
- [ ] 5.4 Implement "Run Daily" and "Run Weekly" automation triggers
- [ ] 5.5 Add keyboard shortcuts
- [ ] 5.6 Performance optimization

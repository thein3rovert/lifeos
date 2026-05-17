# AI Chat Edit Capabilities - Plan

## Context

Currently in LifeOS chat:
- ✅ Chat can read references (`/ref`)
- ✅ Chat can read skills and notes
- ✅ Save chat response → create new note
- ❌ AI editing notes, references, and skills doesn't work

The goal is to enable conversational AI editing of skill content, notes, and reference files.

---

## Current Architecture

### Frontend (Chat)
- `SkillChatModal.tsx` - Chat UI with context selection
- `/ref` - Shows reference selector
- `/` - Shows note selector
- Save button - Creates/updates note with chat response

### Backend (Go)
- `internal/api/` - JSON API handlers
- `internal/store/` - Data storage (SQLite)
- `internal/github/` - GitHub sync

### Sidecar (Node.js)
- Handles AI interactions with OpenCode
- `/skill/update` endpoint - AI rewrite workflow

---

## Desired Behavior

**Conversational editing:**
- User: "Edit the getting-started reference to add a section about installation"
- AI: "Here's my edit..." (shows preview or applies directly)
- Result: Reference file updated

**Seamless editing:**
- No commands needed - AI understands intent
- "Update that note with this info" → updates existing note
- "Save this to the skill" → updates skill content
- "Modify reference X" → edits reference file

---

## Implementation Phases

### Phase 1: Backend - Enable Editing

#### 1.1 Update Notes API
```go
// internal/api/note.go - Add edit endpoint
PUT /api/skills/{skillId}/notes/{noteId}
Body: { "title": string, "content": string }
Response: Note
```

#### 1.2 Create References Edit API
```go
// internal/api/reference.go - New endpoint
PUT /api/skills/{skillId}/files/{path}
Body: { "content": string }
Response: SkillReference
```

#### 1.3 Extend Skill Save API
```go
// internal/api/skill.go - Already exists but needs flexibility
PUT /api/skills/{skillId}
Body: { "content": string }
```

---

### Phase 2: Sidecar - AI Editing Capability

#### 2.1 AI Instructions
Update AI prompt/instructions to include:
- "You can edit notes, reference files, and skill content"
- "When user asks to edit something, call the appropriate API"
- "Offer to preview changes before saving"

#### 2.2 API Integration
Sidecar needs to call these new endpoints:
```javascript
// Update note
PUT /api/skills/${skillId}/notes/${noteId}
Body: { title, content }

// Update reference
PUT /api/skills/${skillId}/files/${path}
Body: { content }

// Update skill
PUT /api/skills/${skillId}
Body: { content }
```

#### 2.3 Edit Flow
1. User expresses edit intent
2. AI prepares new content
3. Offer preview or apply directly
4. Call appropriate API
5. Return success/error to user

---

### Phase 3: Frontend - Chat UI Enhancements

#### 3.1 Edit Indicators
- Show when AI is in "edit mode"
- Display which item is being edited

#### 3.2 Preview/Confirm Flow
- Option 1: AI applies directly (trust AI)
- Option 2: Show diff preview before applying

#### 3.3 Edit Context Menu
Right-click on note/reference in chat:
- "Edit this"
- "Show changes"

---

## Technical Details

### Backend Changes

#### `internal/api/note.go`
```go
func HandleUpdateNote(w http.ResponseWriter, r *http.Request) {
  // PUT /api/skills/{skillId}/notes/{noteId}
  // Parse skillId, noteId from path
  // Parse body: { "title": string, "content": string }
  // Validate ownership
  // Update in SQLite
  // Return updated note
}
```

#### `internal/api/reference.go` (new file)
```go
func HandleUpdateReference(w http.ResponseWriter, r *http.Request) {
  // PUT /api/skills/{skillId}/files/{path}
  // Parse skillId and file path
  // Parse body: { "content": string }
  // Validate skill ownership
  // Write to GitHub (since references are from GitHub)
  // Return updated reference
}
```

### Sidecar Changes

#### `index.js`
```javascript
// Extend message handling
const editCapabilities = {
  canEditNotes: true,
  canEditReferences: true,
  canEditSkills: true
}

// When AI responds with edit intent
if (response.includes('[EDIT_NOTE:')) {
  const edit = parseEditNote(response)
  await api.notes.update(skillId, noteId, edit.content)
}
```

---

## Alternative: Command-Based Editing

If conversational AI editing is too complex, simpler approach:

### Commands
- `/edit-note <id>` - Edit existing note
- `/edit-ref <path>` - Edit reference file
- `/edit-skill` - Edit skill content

### Flow
1. User types `/edit-note 123`
2. Modal opens with note content
3. User edits, clicks save
4. API called to update

### Pros
- Simpler to implement
- More predictable
- User has full control

### Cons
- Less conversational
- More commands to remember

---

## Priority

| Feature | Complexity | Value | Priority |
|---------|------------|-------|----------|
| Edit notes from chat | Low | High | 1 |
| Edit references from chat | Medium | High | 2 |
| Edit skill from chat | Medium | Medium | 3 |
| Conversational (no commands) | High | High | 4 |

---

## Open Questions

1. **Preview vs Direct Apply:** Should AI show diff before applying, or apply directly?

2. **Permissions:** Who can edit? Only the owner or anyone with access?

3. **GitHub Sync:** When editing a reference, should it auto-commit to GitHub or just save locally?

4. **History:** Should we track edit history for rollback capability?

5. **Conflict Resolution:** If skill was updated by someone else while AI was editing?

---

## Status

- [ ] Phase 1: Backend endpoints
- [ ] Phase 2: Sidecar AI editing
- [ ] Phase 3: Frontend enhancements
- [ ] Testing
- [ ] Documentation
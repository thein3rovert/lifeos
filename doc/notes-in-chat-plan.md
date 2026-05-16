# Notes in Chat - Feature Plan

## Overview
Integrate notes into skill chat modal with slash commands for context and AI refinement.

## Current State
- Notes exist but have no titles (only content)
- Notes are manually created in sidebar
- No connection between chat and notes

## Goal
Enable using notes as chat context and refining them through conversation with AI.

---

## Phase 1: Add Note Titles

### Backend Changes
1. **Update Note Schema**
   - [x] Add `title` field to `skill_notes` table (migration)
   - [x] Make title required for new notes
   - [x] Generate titles for existing notes (e.g., "Note 1", "Note 2" or first line)

2. **Update Store Layer** (`internal/store/notes/`)
   - [x] Add `Title` field to `Note` struct
   - [x] Update `SaveNote()` to accept title
   - [x] Update `GetNotes()` to return titles
   - [x] Add `UpdateNote()` method for appending content

3. **Create Service Layer** (`internal/service/note.go`)
   - [x] Create `NoteService` struct
   - [x] `CreateNote(skillID, title, content, type)` - business logic for creating notes
   - [x] `GetNotes(skillID)` - fetch all notes for a skill
   - [x] `UpdateNote(noteID, content)` - append content with timestamp
   - [x] `DeleteNote(noteID)` - delete note
   - [x] Validation logic (title required, etc.)

4. **Update API Layer** (`internal/api/note.go`)
   - [x] Inject `NoteService` instead of store
   - [x] Update `AddNote` handler to use service
   - [x] Add `UpdateNote` handler calling service

### Frontend Changes
5. **Update API Client** (`web/src/lib/api.ts`)
   - [x] Add `title` to note interface
   - [x] Update `addNote()` to send title
   - [x] Add `updateNote()` function

6. **Update UI Components**
   - [x] Add title input to note creation modal/form
   - [x] Show note titles in sidebar list
   - [x] Update existing note forms
   - [x] Display note type badges

---

## Phase 2: Note Types & Tags

### Backend Changes
1. **Update Note Schema**
   - [ ] Add `type` field: `manual` | `ai-generated`
   - [ ] Default to `manual` for user-created
   - [ ] Migration to add field

2. **Update Store Layer**
   - [ ] Add `Type` field to Note struct
   - [ ] Update queries to include type

3. **Update Service Layer**
   - [ ] Update `CreateNote()` to accept type parameter
   - [ ] Default to `manual` for user-created notes
   - [ ] Validate type values

4. **Update API**
   - [ ] Include type in note responses
   - [ ] Filter notes by type if needed

### Frontend Changes
5. **Update UI**
   - [ ] Add visual badges for note types
   - [ ] Different colors: manual (yellow?) vs ai-generated (blue?)

---

## Phase 3: Slash Command for Note Selection

### Frontend Implementation
1. **Slash Command Detection** (`SkillChatModal.tsx`)
   - [x] Detect `/` typed in input
   - [x] Show dropdown menu with all notes for skill
   - [x] Display: `title` + type badge
   - [x] Filter as user types after `/`

2. **Note Selection**
   - [x] Click note → add as context
   - [x] Show context badge above input
   - [x] Badge shows: note title + X to remove
   - [x] Store selected note ID in state

3. **UI Components**
   - [ ] Create `<NoteSelector>` dropdown component
   - [ ] Create `<NoteContextBadge>` component
   - [ ] Style with neumorphic design

---

## Phase 4: Send Note as Context

### Backend Changes
1. **Update Chat Service** (`internal/service/chat.go`)
   - [x] Accept optional `noteId` in SendMessage
   - [x] Fetch note content if provided
   - [x] Prepend note to message as context

2. **Update Chat API** (`internal/api/chat.go`)
   - [x] Accept `noteId` in request body
   - [x] Pass to service

### Frontend Changes
3. **Update Chat Modal**
   - [x] Send `noteId` with message if note in context
   - [x] Clear context badge after send (optional - or keep it?)

---

## Phase 5: Save Refined Content

### Backend Implementation
1. **Note Update Endpoint**
   - [x] `POST /api/skills/{id}/notes/{noteId}/append`
   - [x] Append with timestamp format

2. **Create Note from Chat**
   - [x] `POST /api/skills/{id}/notes/from-chat`
   - [x] Accept: title, content, type: 'ai-generated'

### Frontend Implementation
3. **Save Button UI**
   - [x] Show save button next to send when note is in context
   - [x] Click → open modal with 2 options:
     - "Update existing note"
     - "Create new note"
   
4. **Save Modal**
   - [x] If update: append to selected note
   - [x] If create: prompt for title → create new ai-generated note
   - [x] Show success feedback

5. **Components**
   - [x] Create `<SaveNoteModal>` component
   - [x] Integrate into `SkillChatModal`

---


## Phase 6: Issues Fixed After Testing ✅
- [x] ~~Currently the save notes is saving what i type in the textbox~~ **FIXED**: Now saves AI assistant response instead
  - Added `contentToSave` state to track AI responses
  - Save button moved to each AI message
  - Modal saves the specific AI response that was clicked
- [x] ~~Need to be able to add more than one note as context~~ **FIXED**: Multiple notes context implemented
  - Changed `selectedNote` to `selectedNotes` array
  - Can select multiple notes with `/` command
  - Multiple context badges displayed with individual remove buttons
  - Backend accepts and combines `noteIds` array
  - Filters out already-selected notes from dropdown
- [x] ~~Need to be able to edit a note~~ **FIXED**: Full edit functionality added
  - Added `PATCH /api/skills/{id}/notes/{noteId}` endpoint
  - Edit button (pencil icon) on each note in sidebar
  - Modal reused for editing with updated title/button text
  - Backend `EditNote()` method replaces full content and title
  - CORS updated to allow PATCH method

## Implementation Order

**Week 1: Foundations**
- Phase 1: Add titles (database → API → UI)
- Phase 2: Add types/tags

**Week 2: Chat Integration**  
- Phase 3: Slash command + note selector
- Phase 4: Send note as context

**Week 3: Refinement**
- Phase 5: Save/update notes from chat
- Polish UI/UX

---

## Database Schema Changes

```sql
-- Migration 1: Add title column
ALTER TABLE skill_notes ADD COLUMN title TEXT NOT NULL DEFAULT '';

-- Migration 2: Add type column  
ALTER TABLE skill_notes ADD COLUMN type TEXT NOT NULL DEFAULT 'manual' CHECK(type IN ('manual', 'ai-generated'));

-- Migration 3: Add updated_at for tracking appends
ALTER TABLE skill_notes ADD COLUMN updated_at DATETIME;
```

---

## API Endpoints Summary

**New:**
- `PUT /api/skills/{id}/notes/{noteId}` - Update/append to note (with timestamp)
- `PATCH /api/skills/{id}/notes/{noteId}` - Edit note (full replacement of title and content)
- `POST /api/skills/{id}/notes/from-chat` - Create AI note from chat

**Updated:**
- `POST /api/skills/{id}/notes` - Now requires title
- `POST /api/skills/{id}/chat` - Now accepts optional `noteIds` array (multiple notes as context)

---

## Service Layer Structure

```go
type NoteService struct {
    noteStore  *notes.Store
    skillStore *store.SQLSkillStore
}

func NewNoteService(noteStore *notes.Store, skillStore *store.SQLSkillStore) *NoteService

func (s *NoteService) CreateNote(skillID, title, content, noteType string) error
func (s *NoteService) GetNotes(skillID string) ([]notes.Note, error)
func (s *NoteService) UpdateNote(noteID int, content string) error  // Appends with timestamp
func (s *NoteService) EditNote(noteID int, title, content string) error  // Full replacement
func (s *NoteService) DeleteNote(noteID int) error
```

```go
type ChatService struct {
    // ... fields
}

// Now accepts multiple note IDs for context
func (s *ChatService) SendMessage(skillID, message string, noteIds []int) (string, error)
```

---

**Status:** ✅ Completed
**Started:** 2026-05-08
**Completed:** 2026-05-10

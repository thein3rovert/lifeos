---
id: LOS-014
title: Calendar page with Google Calendar integration + habit tracking
status: To Do
assignee: []
created_date: '2026-08-16 17:17'
updated_date: '2026-08-16 17:18'
labels: []
dependencies: []
priority: medium
type: feature
ordinal: 6500
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New calendar page at `/calendar` with monthly + weekly views displaying Google Calendar events (bidirectional sync — read AND create/edit events from LifeOS). Daily habit tracking overlaid on calendar days with checkboxes. Per-user habit CRUD (create, edit, rename, delete — not a fixed list).

**Design decisions:**
- Google Calendar sync: **bidirectional** (display Google events + create/edit events from LifeOS)
- Habit tracking: **per-user CRUD** (user creates/edits/renames/deletes their own habits — no fixed/predefined list)
- Calendar views: **monthly + weekly**
- Google OAuth creds: user needs to set up a Google Cloud project + OAuth client ID — part of this task's scope (runbook/guided setup)

**Scope:** multi-PR feature. Split into 5 subtasks below. Subtasks LOS-012.2 (backend Google sync) and LOS-012.3 (habits backend) can be worked in parallel. LOS-012.4 depends on the Google sync backend; LOS-012.5 depends on the habits backend + the calendar page.

**Out of scope (flag for future):**
- Streaks / completion % analytics beyond raw toggle history
- Notifications/reminders
- Multiple Google accounts
- CalDAV/iCloud support
<!-- SECTION:DESCRIPTION:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## LOS-014 — Calendar page with Google Calendar integration + habit tracking

### Decisions (locked with user)
- **Google Calendar sync:** bidirectional (display events + create/edit from LifeOS)
- **Habit tracking:** per-user CRUD (create, edit, rename, delete — no fixed list)
- **Calendar views:** monthly + weekly
- **Google OAuth creds:** user will set up a Google Cloud project with guided runbook (subtask LOS-014.01)

### Subtask breakdown
| ID | Title | Depends on | Can parallelize? |
|----|-------|------------|------------------|
| LOS-014.01 | Set up Google OAuth credentials + backend config (runbook) | — | Yes (first) |
| LOS-014.02 | Backend: Google Calendar OAuth flow + bidirectional sync endpoints | LOS-014.01 | Yes (with 014.03) |
| LOS-014.03 | Backend: Habits data model + CRUD API + daily completion tracking | — | Yes (with 014.02) |
| LOS-014.04 | Frontend: Calendar page (month + week views) + Google connect flow | LOS-014.02 | After 014.02 merges |
| LOS-014.05 | Frontend: Habit management CRUD + daily checkboxes on calendar | LOS-014.03, LOS-014.04 | After both merge |

### Suggested build order
1. **LOS-014.01** (creds + runbook) — pairs with user on Google Cloud setup
2. **LOS-014.03** (habits backend) — independent, can start immediately, no deps
3. **LOS-014.02** (Google sync backend) — after creds ready
4. **LOS-014.04** (calendar UI) — after 014.02 merges
5. **LOS-014.05** (habit UI + checkboxes) — after 014.03 + 014.04 merge

### Out of scope
- Streaks / completion % analytics beyond raw toggle history
- Notifications / reminders
- Multiple Google accounts
- CalDAV / iCloud support
- Calendar sharing / delegation
<!-- SECTION:PLAN:END -->

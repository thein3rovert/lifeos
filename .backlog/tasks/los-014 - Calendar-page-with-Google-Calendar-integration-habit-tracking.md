---
id: LOS-014
title: Calendar page with Google Calendar integration + habit tracking
status: To Do
assignee: []
created_date: '2026-08-16 17:17'
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

---
id: LOS-015
title: Improve calendar event interactions and visual distinctions
status: In Progress
assignee:
  - '@thein3rovert'
created_date: '2026-08-22 10:03'
updated_date: '2026-09-05 12:55'
labels: []
dependencies: []
references:
  - web/src/features/calendar/components/WeekView.tsx
  - web/src/features/calendar/components/EventForm.tsx
  - web/src/features/calendar/components/CalendarPage.tsx
  - web/src/lib/api/calendar.ts
priority: medium
type: enhancement
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Improve the calendar experience with safer drag-and-drop, resizable event durations, event duplication, and distinct habit styling once habit display is available. Dragging and resizing should provide clear time feedback to reduce accidental scheduling changes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Dragging an event displays a clear destination preview including the target day and time
- [x] #2 Week-view events can be resized to change their duration with visible proposed time feedback
- [x] #3 Drop and resize interactions use practical time increments and prevent invalid durations
- [x] #4 Failed event moves or resizes restore the previous display and show an error
- [x] #5 An existing event can be duplicated without re-entering its details
- [ ] #6 Habits use a visually distinct calendar color after habit calendar integration is available
- [x] #7 Focused interaction tests and frontend build and lint checks pass
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation plan
1. Add shared 15-minute snapping and time-range helpers for consistent drag and resize calculations.
2. Enhance `WeekView` with an event-shaped destination preview showing target day/start/end, calculate 15-minute drop targets from pointer position, and add a bottom-edge pointer resize handle with minimum-duration validation.
3. Make timing mutations async/result-bearing so previews remain while saving and cleanly restore the original event after failures; align month-view moves with that contract.
4. Add direct event duplication to the edit form and lock conflicting form actions during mutations.
5. Add focused tests for interaction math and duplication, then run frontend build/lint and backend tests.

Habit color remains blocked until LOS-014.03/LOS-014.05 provide habit data and calendar rendering, so this session will implement criteria 1-5 and 7 only.

### Optimistic timing updates
- Add a local event updater to `useCalendarEvents` so drag/drop and resize can immediately replace the displayed event timing before network persistence.
- In `CalendarPage`, snapshot the original event, apply the local timing change synchronously, persist to Google in the background, and restore the snapshot if PATCH fails; refresh after success for server reconciliation without blocking the visual move.
- Extend focused hook tests to prove immediate update and rollback behavior, then rerun existing calendar tests/build checks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the currently unblocked calendar interaction scope. Week view now renders an event-sized dashed destination preview with target weekday and exact start/end while dragging, snaps moves to 15-minute increments, and supports bottom-edge pointer resizing with live time/duration feedback and a 15-minute minimum. Timing changes await API persistence and restore the server-backed original display on failures with operation-specific toasts. Edit mode now includes Duplicate, cloning title/time/description/location through the existing create endpoint; form actions are locked during mutations and datetime inputs use 15-minute steps. Focused verification passed: Biome check on changed files, 9 Vitest tests across interaction utilities/drag preview/duplication/event-fetch race, frontend production build, backend `go test ./...`, and `git diff --check`. `tsc --noEmit` has one unrelated pre-existing error in `ScheduleCard.tsx` (`panelType` unused). Habit color remains blocked on habit backend/UI tasks LOS-014.03 and LOS-014.05.

Added optimistic timing updates: dropping or resizing now updates the local event list immediately, then persists to Google Calendar and refreshes in the background for reconciliation. If PATCH fails, the original start/end snapshot is restored and the existing failure toast explains the rollback. Added hook coverage proving local updates occur without a refetch. Verification passed: 10 Vitest tests, focused Biome checks, frontend production build, backend Go tests, and whitespace validation.
<!-- SECTION:NOTES:END -->

# Smart Board Scheduler Settings Plan

**Date:** 2026-06-21  
**Goal:** Give the user full control over smart-board panel auto-refresh timing from a dedicated settings page.

---

## Current Behavior

The backend scheduler (`server/internal/services/scheduler.go`) runs four panel schedules with hard-coded intervals:

| Panel | Schedule |
| ----- | -------- |
| `blockers` | every 5 hours |
| `things-to-remember` | every 6 hours |
| `suggestions` | weekly Saturday 08:00 |
| `achievements` | weekly Saturday 08:00 |

The frontend only displays the next refresh countdown; it cannot pause, resume, or change schedules.

---

## Desired Behavior

1. **Per-panel pause/resume** — stop a panel from auto-refreshing without affecting others.
2. **Per-panel custom schedule** — change interval (e.g., every 2 hours) or weekly day/time.
3. **Global pause/resume all** — one toggle to pause/resume every panel at once.
4. **Persistence** — settings survive server restart.
5. **Settings page** — a new `/settings` page to manage all schedules.

---

## Backend Plan

### 1. Data Model

Add a `panel_schedules` table in SQLite:

```sql
CREATE TABLE IF NOT EXISTS panel_schedules (
    panel_type TEXT PRIMARY KEY,
    paused BOOLEAN DEFAULT FALSE,
    mode TEXT DEFAULT 'interval', -- 'interval' or 'weekly'
    interval_minutes INTEGER,     -- used when mode = 'interval'
    weekly_day INTEGER,           -- 0-6, used when mode = 'weekly'
    weekly_hour INTEGER,          -- 0-23
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Seed default rows matching the current hard-coded schedules.

### 2. Scheduler Refactor

`server/internal/services/scheduler.go`:

- Load schedules from DB on `NewScheduler` / `Start`.
- Keep an in-memory `paused` map per panel.
- Keep per-panel schedule config (interval or weekly day/hour).
- In `runInterval` and `runWeekly`, skip refresh when paused.
- Add methods:
  - `Pause(panelType string)` / `Resume(panelType string)`
  - `PauseAll()` / `ResumeAll()`
  - `SetSchedule(panelType, config)`
  - `IsPaused(panelType) bool`
- Update `Status()` to include `paused`, `mode`, `interval`, `weeklyDay`, `weeklyHour`.

### 3. API Endpoints

`server/internal/api/smartboard/smartboard.go`:

- `GET /api/smartboard/schedule` — already exists; extend response with pause + config fields.
- `POST /api/smartboard/schedule/{panelType}/pause`
- `POST /api/smartboard/schedule/{panelType}/resume`
- `POST /api/smartboard/schedule/{panelType}` — body: `{ mode, intervalMinutes, weeklyDay, weeklyHour }`
- `POST /api/smartboard/schedule/pause-all`
- `POST /api/smartboard/schedule/resume-all`

### 4. Store Layer

`server/internal/store/smartboard/schedule.go`:

- `GetPanelSchedule(panelType string) (*PanelSchedule, error)`
- `SavePanelSchedule(schedule *PanelSchedule) error`
- `GetAllPanelSchedules() ([]*PanelSchedule, error)`

---

## Frontend Plan

### 1. Types

Extend `ScheduleStatus` / add `PanelScheduleConfig`:

```ts
export interface PanelScheduleStatus {
  panelType: PanelType;
  nextRefresh: string;
  lastError?: string;
  paused: boolean;
  mode: 'interval' | 'weekly';
  intervalMinutes?: number;
  weeklyDay?: number;
  weeklyHour?: number;
}
```

### 2. API Client

`web/src/lib/api/smartboard.ts`:

- `getSchedule()`
- `pausePanel(panelType)`
- `resumePanel(panelType)`
- `setPanelSchedule(panelType, config)`
- `pauseAllPanels()`
- `resumeAllPanels()`

### 3. Settings Page

`web/src/routes/settings/index.tsx`:

- Global "Pause all auto-refresh" toggle.
- One card per panel showing:
  - Panel name
  - Pause/resume toggle
  - Schedule mode selector (interval / weekly)
  - Interval input (hours/minutes)
  - Weekly day + time picker
  - Next refresh preview
- Save per-panel or global save button.

### 4. SmartBoard Panel UI

`SmartBoardPanel.tsx`:

- Show a small pause icon in the header when paused.
- Optional: quick "Pause" / "Resume" action in the panel header menu.

### 5. React Hook

`web/src/features/smartboard/hooks/usePanelSchedule.ts`:

- Load schedule status.
- Expose `pause`, `resume`, `setSchedule`, `pauseAll`, `resumeAll` helpers.

---

## Implementation Phases

### Phase 1 — Backend Foundation

1. Create `panel_schedules` table + seed defaults.
2. Refactor scheduler to read from DB and support pause/resume.
3. Add scheduler methods: `Pause`, `Resume`, `PauseAll`, `ResumeAll`.
4. Extend `GET /api/smartboard/schedule` response.
5. Test Go build + existing behavior unchanged.

### Phase 2 — Backend API

1. Add `POST` endpoints for pause/resume/set per panel and global.
2. Add store methods for schedule CRUD.
3. Wire scheduler updates through the service layer.
4. Unit-test scheduler state transitions.

### Phase 3 — Frontend Settings Page

1. Build `/settings` route with panel schedule cards.
2. Add smartboard API client methods.
3. Implement pause/resume + custom schedule UI.
4. Add global pause/resume toggle.

### Phase 4 — Panel UI Polish

1. Show paused state in `SmartBoardPanel` header.
2. Add quick pause/resume action in panel header.
3. Update `useScheduleStatus` polling to reflect pause state.

---

## Open Questions

1. Should paused panels still allow manual refresh? **Recommended:** yes — the refresh button should always work.
2. Should custom schedules apply immediately or after the next server restart? **Recommended:** immediately; scheduler re-reads config when updated.
3. Should settings be user-specific or global? **Recommended:** global for now (single-user app).
4. Should the settings page live at `/settings` or under a sub-route like `/settings/smartboard`? **Recommended:** `/settings` for now; add tabs later if it grows.

---

## Next Step

Start **Phase 1** (backend foundation) or refine this plan first.

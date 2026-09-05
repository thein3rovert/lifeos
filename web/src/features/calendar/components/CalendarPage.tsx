import {
  CalendarDays,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Link2,
  List,
  Plus,
  Table2,
  Unlink,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import {
  addDays,
  buildMonthGrid,
  formatMonthYear,
  formatWeekRange,
  startOfMonth,
  startOfWeek,
  toLocalDateKey,
  toRFC3339,
  useCalendarEvents,
  useCalendarOAuthStatus,
  useHabitCompletions,
  useHabitDays,
  useHabits,
} from '@/features/calendar';
import { usePersistentState } from '@/hooks/usePersistentState';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import type { CalendarEvent, Habit } from '@/types';
import { EventForm } from './EventForm';
import { HabitForm } from './HabitForm';
import { HabitManagementPanel } from './HabitManagementPanel';
import { HabitMonthView } from './HabitMonthView';
import { HabitTableView } from './HabitTableView';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

type CalendarView = 'month' | 'week';
type CalendarMode = 'calendar' | 'habits';
type HabitView = 'month' | 'table';

export function getCalendarLoadErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.code === 'google_calendar_rate_limited') {
    return 'Google Calendar is temporarily rate limited. Try again shortly.';
  }
  if (error instanceof ApiError && error.code === 'google_calendar_reauthorization_required') {
    return 'Google Calendar access expired. Reconnect to continue.';
  }
  return 'Failed to load events.';
}

export function CalendarPage() {
  const [mode, setMode] = usePersistentState<CalendarMode>('lifeos:calendar:mode', 'calendar');
  const [habitView, setHabitView] = usePersistentState<HabitView>('lifeos:habits:view', 'month');
  const [habitManagementCollapsed, setHabitManagementCollapsed] = usePersistentState(
    'lifeos:habits:management-collapsed',
    true
  );
  // Persisted across nav — stored as ISO string (JSON-serializable).
  const [view, setView] = usePersistentState<CalendarView>('lifeos:calendar:view', 'month');
  const [viewDateStr, setViewDateStr] = usePersistentState<string>(
    'lifeos:calendar:date',
    new Date().toISOString()
  );
  const viewDate = new Date(viewDateStr);
  const setViewDate = (d: Date) => setViewDateStr(d.toISOString());

  const [oauthRefetchKey, setOauthRefetchKey] = useState(0);
  const { connected, loading: oauthLoading } = useCalendarOAuthStatus(oauthRefetchKey);

  // Compute the fetch range based on the current view.
  const fetchRange = (() => {
    if (view === 'month') {
      const start = startOfMonth(viewDate);
      const end = addDays(start, 42);
      return { start: toRFC3339(start), end: toRFC3339(end) };
    }
    const start = startOfWeek(viewDate);
    const end = addDays(start, 7);
    return { start: toRFC3339(start), end: toRFC3339(end) };
  })();

  const { events, error, refresh, updateEventLocally } = useCalendarEvents(
    fetchRange.start,
    fetchRange.end,
    !oauthLoading && connected
  );
  const needsReconnect =
    error instanceof ApiError && error.code === 'google_calendar_reauthorization_required';
  const {
    habits,
    loading: habitsLoading,
    error: habitsError,
    refresh: refreshHabits,
  } = useHabits(mode === 'habits');
  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const habitGrid = buildMonthGrid(viewDate);
  const completionStart = toLocalDateKey(habitGrid[0]);
  const completionEnd = toLocalDateKey(habitGrid[habitGrid.length - 1]);
  const {
    days: habitDays,
    loading: habitDaysLoading,
    error: habitDaysError,
    refresh: refreshHabitDays,
    createToday,
  } = useHabitDays(completionStart, completionEnd, mode === 'habits');
  const {
    completedKeys,
    loading: completionsLoading,
    error: completionsError,
    refresh: refreshCompletions,
    toggleCompletion,
  } = useHabitCompletions(completionStart, completionEnd, mode === 'habits');

  const openHabitForm = (habit: Habit | null = null) => {
    setEditingHabit(habit);
    setHabitFormOpen(true);
  };

  const handleNewHabitDay = async () => {
    try {
      const { created } = await createToday(toLocalDateKey(new Date()));
      setViewDate(new Date());
      toast(created ? 'Today added' : 'Today already exists', 'success');
    } catch {
      toast('Failed to add today', 'error');
    }
  };

  // Navigation
  const goPrev = () => {
    if (mode === 'habits' || view === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else {
      setViewDate(addDays(startOfWeek(viewDate), -7));
    }
  };

  const goNext = () => {
    if (mode === 'habits' || view === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else {
      setViewDate(addDays(startOfWeek(viewDate), 7));
    }
  };

  const goToday = () => setViewDate(new Date());

  // Google connect / disconnect
  const handleConnect = () => {
    window.location.href = api.calendar.getOAuthStartUrl();
  };

  const handleDisconnect = async () => {
    try {
      await api.calendar.disconnect();
      setOauthRefetchKey((k) => k + 1);
      toast('Disconnected from Google Calendar', 'success');
    } catch {
      toast('Failed to disconnect', 'error');
    }
  };

  // Calendar callbacks
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formInitialStart, setFormInitialStart] = useState<Date | undefined>();
  const [pendingTiming, setPendingTiming] = useState<{
    event: CalendarEvent;
    start: Date;
    end: Date;
    operation: 'move' | 'resize';
  } | null>(null);

  const openCreateAt = (start: Date) => {
    setEditingEvent(null);
    setFormInitialStart(start);
    setFormOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormInitialStart(undefined);
    setFormOpen(true);
  };

  const handleDayClick = (date: Date) => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0); // default 9 AM
    openCreateAt(start);
  };

  const handleSlotClick = (date: Date, hour: number) => {
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    openCreateAt(start);
  };

  const handleAddEventClick = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    openCreateAt(now);
  };

  // Handle the timing off an event, this help during updating
  // an event either locally or in the database
  const handleEventTimingChange = async (
    event: CalendarEvent,
    newStart: Date,
    newEnd: Date,
    operation: 'move' | 'resize' = 'move'
  ): Promise<boolean> => {
    if (event.recurrence) {
      setPendingTiming({ event, start: newStart, end: newEnd, operation });
      return true;
    }
    return persistTimingChange(event, event.id, newStart, newEnd, operation);
  };

  const persistTimingChange = async (
    originalEvent: CalendarEvent,
    targetId: string,
    newStart: Date,
    newEnd: Date,
    operation: 'move' | 'resize'
  ): Promise<boolean> => {
    // Update event local for faster update first
    updateEventLocally(originalEvent.id, {
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
    });

    // After event saved locally then update db
    try {
      await api.calendar.updateEvent(targetId, {
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
      toast(operation === 'resize' ? 'Event resized' : 'Event moved', 'success');
      void refresh({ force: true });
      return true;
    } catch {
      updateEventLocally(originalEvent.id, { start: originalEvent.start, end: originalEvent.end });
      toast(
        operation === 'resize'
          ? 'Failed to resize event; the original duration was restored'
          : 'Failed to move event; the original time was restored',
        'error'
      );
      return false;
    }
  };

  const headerLabel =
    mode === 'habits' || view === 'month'
      ? formatMonthYear(startOfMonth(viewDate))
      : formatWeekRange(startOfWeek(viewDate));

  return (
    <div className={`min-h-screen bg-base relative ${mode === 'habits' ? 'pb-6' : 'pb-40'}`}>
      <div className="container mx-auto px-6 py-6">
        <div className="mb-4 inline-flex rounded-md border border-default bg-raised p-0.5">
          <button
            type="button"
            onClick={() => setMode('calendar')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs ${mode === 'calendar' ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-hover'}`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
          <button
            type="button"
            onClick={() => setMode('habits')}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs ${mode === 'habits' ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-hover'}`}
          >
            <CheckSquare2 className="h-3.5 w-3.5" /> Habits
          </button>
        </div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goPrev} aria-label="Previous">
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </Button>
            <Button variant="ghost" size="sm" onClick={goNext} aria-label="Next">
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Today
            </Button>
            <h1 className="text-lg font-medium text-primary ml-2">{headerLabel}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            {mode === 'calendar' && (
              <div className="inline-flex rounded-md border border-default bg-raised">
                <button
                  type="button"
                  onClick={() => setView('month')}
                  className={`px-3 py-1 text-xs rounded-l-md transition-colors ${
                    view === 'month'
                      ? 'bg-tab-active text-primary'
                      : 'text-secondary hover:bg-active'
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setView('week')}
                  className={`px-3 py-1 text-xs rounded-r-md transition-colors ${
                    view === 'week'
                      ? 'bg-tab-active text-primary'
                      : 'text-secondary hover:bg-active'
                  }`}
                >
                  Week
                </button>
              </div>
            )}
            {mode === 'habits' && (
              <div className="inline-flex rounded-md border border-default bg-raised">
                <button
                  type="button"
                  onClick={() => setHabitView('month')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs ${habitView === 'month' ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-active'}`}
                >
                  <Table2 className="h-3.5 w-3.5" /> Month
                </button>
                <button
                  type="button"
                  onClick={() => setHabitView('table')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs ${habitView === 'table' ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-active'}`}
                >
                  <List className="h-3.5 w-3.5" /> Table
                </button>
              </div>
            )}

            {/* Google connect / disconnect */}
            {mode === 'habits' ? (
              <Button variant="primary" size="sm" onClick={() => void handleNewHabitDay()}>
                New
              </Button>
            ) : oauthLoading ? (
              <span className="text-xs text-tertiary">Checking…</span>
            ) : connected ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddEventClick}
                  leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={1.5} />}
                >
                  Add event
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  leftIcon={<Unlink className="w-3.5 h-3.5" strokeWidth={1.5} />}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnect}
                leftIcon={<Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
              >
                Connect Google
              </Button>
            )}
          </div>
        </div>

        {/* Calendar body */}
        {mode === 'habits' ? (
          <>
            <HabitManagementPanel
              habits={habits}
              loading={habitsLoading}
              error={habitsError}
              onAdd={() => openHabitForm()}
              onEdit={openHabitForm}
              onRefresh={refreshHabits}
              collapsed={habitManagementCollapsed}
              onToggleCollapsed={() => setHabitManagementCollapsed((value) => !value)}
            />
            {(completionsError || habitDaysError) && (
              <div className="mb-3 flex items-center justify-between rounded-md border border-error/40 bg-error/10 px-3 py-2 text-xs text-error">
                <span>Failed to load or update habit completions.</span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => void Promise.all([refreshCompletions(), refreshHabitDays()])}
                >
                  Retry
                </button>
              </div>
            )}
            {completionsLoading || habitDaysLoading ? (
              <div className="rounded-lg border border-default bg-raised py-16 text-center text-xs text-tertiary">
                Loading habit completions…
              </div>
            ) : habitView === 'month' ? (
              <HabitMonthView
                viewDate={viewDate}
                habits={habits}
                habitDays={habitDays}
                completedKeys={completedKeys}
                onToggle={toggleCompletion}
                onAddHabit={() => openHabitForm()}
                managementCollapsed={habitManagementCollapsed}
              />
            ) : (
              <HabitTableView
                viewDate={viewDate}
                habits={habits}
                habitDays={habitDays}
                completedKeys={completedKeys}
                onToggle={toggleCompletion}
              />
            )}
          </>
        ) : connected ? (
          <div className="bg-raised border border-default rounded-lg p-4">
            {error ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-sm">
                <p className="text-error">{getCalendarLoadErrorMessage(error)}</p>
                {needsReconnect ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConnect}
                    leftIcon={<Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
                  >
                    Reconnect Google Calendar
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void refresh({ force: true })}
                    className="text-error underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : view === 'month' ? (
              <MonthView
                viewDate={viewDate}
                events={events}
                onDayClick={handleDayClick}
                onEventClick={handleEventClick}
                onEventTimingChange={handleEventTimingChange}
              />
            ) : (
              <WeekView
                viewDate={viewDate}
                events={events}
                onSlotClick={handleSlotClick}
                onEventClick={handleEventClick}
                onEventTimingChange={handleEventTimingChange}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <CalendarDays className="w-12 h-12 text-tertiary mb-4" strokeWidth={1.5} />
            <p className="text-secondary text-sm mb-1">No calendar connected</p>
            <p className="text-tertiary text-xs mb-4">Connect your Google Calendar to see events</p>
            <Button
              variant="primary"
              size="md"
              onClick={handleConnect}
              leftIcon={<Link2 className="w-4 h-4" strokeWidth={1.5} />}
            >
              Connect Google Calendar
            </Button>
          </div>
        )}
      </div>

      {/* Event create/edit dialog */}
      <EventForm
        isOpen={formOpen}
        event={editingEvent}
        initialStart={formInitialStart}
        onClose={() => setFormOpen(false)}
        onSaved={() => refresh({ force: true })}
      />
      <HabitForm
        isOpen={habitFormOpen}
        habit={editingHabit}
        onClose={() => setHabitFormOpen(false)}
        onSaved={refreshHabits}
      />
      {pendingTiming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-default bg-raised p-4 shadow-lg">
            <h3 className="text-sm font-medium text-primary">
              {pendingTiming.operation === 'move'
                ? 'Move recurring event'
                : 'Resize recurring event'}
            </h3>
            <p className="mt-2 text-xs text-secondary">Choose what this change should affect.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  const pending = pendingTiming;
                  setPendingTiming(null);
                  void persistTimingChange(
                    pending.event,
                    pending.event.id,
                    pending.start,
                    pending.end,
                    pending.operation
                  );
                }}
              >
                This occurrence only
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  const pending = pendingTiming;
                  setPendingTiming(null);
                  if (!pending.event.recurrence) return;
                  void persistTimingChange(
                    pending.event,
                    pending.event.recurrence.seriesId,
                    pending.start,
                    pending.end,
                    pending.operation
                  );
                }}
              >
                Entire series
              </Button>
              <Button variant="ghost" size="md" onClick={() => setPendingTiming(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { CalendarDays, ChevronLeft, ChevronRight, Link2, Plus, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import {
  addDays,
  formatMonthYear,
  formatWeekRange,
  startOfMonth,
  startOfWeek,
  toRFC3339,
  useCalendarEvents,
  useCalendarOAuthStatus,
} from '@/features/calendar';
import { usePersistentState } from '@/hooks/usePersistentState';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api/client';
import type { CalendarEvent } from '@/types';
import { EventForm } from './EventForm';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

type CalendarView = 'month' | 'week';

export function CalendarPage() {
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

  const { events, error, refresh } = useCalendarEvents(fetchRange.start, fetchRange.end);
  const needsReconnect =
    error instanceof ApiError && error.code === 'google_calendar_reauthorization_required';

  // Navigation
  const goPrev = () => {
    if (view === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else {
      setViewDate(addDays(startOfWeek(viewDate), -7));
    }
  };

  const goNext = () => {
    if (view === 'month') {
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

  const handleEventMove = async (eventId: string, newStart: Date, newEnd: Date) => {
    try {
      await api.calendar.updateEvent(eventId, {
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      });
      toast('Event moved', 'success');
      refresh();
    } catch {
      toast('Failed to move event', 'error');
    }
  };

  const headerLabel =
    view === 'month'
      ? formatMonthYear(startOfMonth(viewDate))
      : formatWeekRange(startOfWeek(viewDate));

  return (
    <div className="min-h-screen bg-base relative pb-40">
      <div className="container mx-auto px-6 py-6">
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
            <div className="inline-flex rounded-md border border-default bg-raised">
              <button
                type="button"
                onClick={() => setView('month')}
                className={`px-3 py-1 text-xs rounded-l-md transition-colors ${
                  view === 'month' ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-active'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setView('week')}
                className={`px-3 py-1 text-xs rounded-r-md transition-colors ${
                  view === 'week' ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-active'
                }`}
              >
                Week
              </button>
            </div>

            {/* Google connect / disconnect */}
            {oauthLoading ? (
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
        {connected ? (
          <div className="bg-raised border border-default rounded-lg p-4">
            {error ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-sm">
                <p className="text-error">
                  {needsReconnect
                    ? 'Google Calendar access expired. Reconnect to continue.'
                    : 'Failed to load events.'}
                </p>
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
                  <button type="button" onClick={refresh} className="text-error underline">
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
                onEventMove={handleEventMove}
              />
            ) : (
              <WeekView
                viewDate={viewDate}
                events={events}
                onSlotClick={handleSlotClick}
                onEventClick={handleEventClick}
                onEventMove={handleEventMove}
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
        onSaved={refresh}
      />
    </div>
  );
}

import { ChevronLeft, ChevronRight, CalendarDays, Link2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { usePersistentState } from '@/hooks/usePersistentState';
import { api } from '@/lib/api';
import {
  startOfMonth,
  startOfWeek,
  addDays,
  formatMonthYear,
  formatWeekRange,
  toRFC3339,
  useCalendarEvents,
  useCalendarOAuthStatus,
} from '@/features/calendar';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import type { CalendarEvent } from '@/types';

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
  const handleEventClick = (event: CalendarEvent) => {
    // Phase 4: open edit dialog
    console.log('edit event', event.id);
  };

  const handleDayClick = (_date: Date) => {
    // Phase 4: open create dialog with prefilled date
    console.log('create event on day');
  };

  const handleSlotClick = (_date: Date, _hour: number) => {
    // Phase 4: open create dialog with prefilled date + hour
    console.log('create event at hour');
  };

  const headerLabel =
    view === 'month'
      ? formatMonthYear(startOfMonth(viewDate))
      : formatWeekRange(startOfWeek(viewDate));

  return (
    <div className="min-h-screen bg-base relative pb-32">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                leftIcon={<Unlink className="w-3.5 h-3.5" strokeWidth={1.5} />}
              >
                Disconnect
              </Button>
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
              <div className="text-center py-12 text-error text-sm">
                Failed to load events.{' '}
                <button type="button" onClick={refresh} className="underline">
                  Retry
                </button>
              </div>
            ) : (
              view === 'month' ? (
                <MonthView
                  viewDate={viewDate}
                  events={events}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                />
              ) : (
                <WeekView
                  viewDate={viewDate}
                  events={events}
                  onSlotClick={handleSlotClick}
                  onEventClick={handleEventClick}
                />
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <CalendarDays className="w-12 h-12 text-tertiary mb-4" strokeWidth={1.5} />
            <p className="text-secondary text-sm mb-1">No calendar connected</p>
            <p className="text-tertiary text-xs mb-4">
              Connect your Google Calendar to see events
            </p>
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
    </div>
  );
}
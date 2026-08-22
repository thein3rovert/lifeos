import { ChevronLeft, ChevronRight, CalendarDays, Link2, Unlink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { usePersistentState } from '@/hooks/usePersistentState';
import { api } from '@/lib/api';
import {
  addDays,
  buildMonthGrid,
  buildWeekGrid,
  formatMonthYear,
  formatWeekRange,
  startOfMonth,
  startOfWeek,
  useCalendarOAuthStatus,
} from '@/features/calendar';

type CalendarView = 'month' | 'week';

export function CalendarPage() {

  // Persisted across nav — survives route unmount/remount + same-tab refresh.
// Stored as ISO string (usePersistentState JSON-serializes, which turns Date into string).
  const [view, setView] = usePersistentState<CalendarView>('lifeos:calendar:view', 'month');
  const [viewDateStr, setViewDateStr] = usePersistentState<string>('lifeos:calendar:date', new Date().toISOString());
  const viewDate = new Date(viewDateStr);
  const setViewDate = (d: Date) => setViewDateStr(d.toISOString());

  // OAuth status — re-check after OAuth callback redirect.
  // `oauthRefetchKey` bump forces a re-check after connect/disconnect.
  const [oauthRefetchKey, setOauthRefetchKey] = useState(0);
  const { connected, loading: oauthLoading } = useCalendarOAuthStatus(oauthRefetchKey);

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
      setOauthRefetchKey(k => k + 1);
      toast('Disconnected from Google Calendar', 'success');
    } catch {
      toast('Failed to disconnect', 'error');
    }
  };

  // Header label
  const headerLabel =
    view === 'month'
      ? formatMonthYear(startOfMonth(viewDate))
      : formatWeekRange(startOfWeek(viewDate));

  return (
    <div className="min-h-screen bg-base relative pb-32">
      <div className="container mx-auto px-6 py-6">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-4">
          {/* Left: navigation + title */}
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

          {/* Right: view toggle + Google connect */}
          <div className="flex items-center gap-2">
            {/* View toggle */}
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

            {/* Google connect / disconnect */}
            {oauthLoading ? (
              <span className="text-xs text-tertiary">Checking…</span>
            ) : connected ? (
              <Button variant="ghost" size="sm" onClick={handleDisconnect} leftIcon={<Unlink className="w-3.5 h-3.5" strokeWidth={1.5} />}>
                Disconnect
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleConnect} leftIcon={<Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />}>
                Connect Google
              </Button>
            )}
          </div>
        </div>

        {/* Calendar body */}
        {connected ? (
          <div className="bg-raised border border-default rounded-lg p-4">
            {view === 'month' ? (
              <MonthPlaceholder viewDate={viewDate} />
            ) : (
              <WeekPlaceholder viewDate={viewDate} />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <CalendarDays className="w-12 h-12 text-tertiary mb-4" strokeWidth={1.5} />
            <p className="text-secondary text-sm mb-1">No calendar connected</p>
            <p className="text-tertiary text-xs mb-4">
              Connect your Google Calendar to see events
            </p>
            <Button variant="primary" size="md" onClick={handleConnect} leftIcon={<Link2 className="w-4 h-4" strokeWidth={1.5} />}>
              Connect Google Calendar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder renders — replaced in Phase 3
function MonthPlaceholder({ viewDate }: { viewDate: Date }) {
  const grid = buildMonthGrid(viewDate);
  return (
    <div className="grid grid-cols-7 gap-px bg-border-default">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="bg-raised text-center text-xs text-tertiary py-2">
          {day}
        </div>
      ))}
      {grid.map((date, i) => (
        <div
          key={i}
          className="bg-base min-h-[80px] p-1.5 text-xs text-secondary"
        >
          {date.getDate()}
        </div>
      ))}
    </div>
  );
}

function WeekPlaceholder({ viewDate }: { viewDate: Date }) {
  const week = buildWeekGrid(viewDate);
  return (
    <div className="text-center py-12 text-tertiary text-sm">
      Week view placeholder — events render in Phase 3. Days: {week.map(d => d.getDate()).join(', ')}
    </div>
  );
}
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { CalendarEvent } from '@/types';

export function useCalendarEvents(start: string, end: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.calendar.getEvents(start, end);
      setEvents(res.events);
      setError(null);
    } catch (err) {
      const normalized = toError(err);
      setError(normalized);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refresh: fetchEvents };
}
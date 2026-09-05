import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { CalendarEvent } from '@/types';

export function useCalendarEvents(start: string, end: string, enabled = true) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const fetchEvents = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!enabled) {
      setEvents([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.calendar.getEvents(start, end);
      if (requestId !== requestIdRef.current) return;
      setEvents(res.events);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      const normalized = toError(err);
      setError(normalized);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [start, end, enabled]);

  useEffect(() => {
    void fetchEvents();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchEvents]);

  const updateEventLocally = useCallback((eventId: string, patch: Partial<CalendarEvent>) => {
    setEvents((current) =>
      current.map((event) => (event.id === eventId ? { ...event, ...patch } : event))
    );
  }, []);

  return { events, loading, error, refresh: fetchEvents, updateEventLocally };
}

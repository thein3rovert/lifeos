import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { CalendarEvent } from '@/types';

const FRESHNESS_WINDOW_MS = 5_000;

type EventsResponse = { events: CalendarEvent[] };
type RangeRequest = {
  promise?: Promise<EventsResponse>;
  forced?: boolean;
  data?: EventsResponse;
  updatedAt?: number;
};

const rangeRequests = new Map<string, RangeRequest>();

function getRangeEvents(start: string, end: string, force = false): Promise<EventsResponse> {
  const key = `${start}\u0000${end}`;
  const current = rangeRequests.get(key);

  if (current?.promise && (!force || current.forced)) return current.promise;
  if (!force && current?.data && Date.now() - (current.updatedAt ?? 0) < FRESHNESS_WINDOW_MS) {
    return Promise.resolve(current.data);
  }

  const request: RangeRequest = { forced: force };
  const promise = api.calendar.getEvents(start, end).then((data) => {
    if (rangeRequests.get(key) === request) {
      request.data = data;
      request.updatedAt = Date.now();
      request.promise = undefined;
      request.forced = undefined;
    }
    return data;
  });
  request.promise = promise;
  rangeRequests.set(key, request);

  void promise.catch(() => {
    if (rangeRequests.get(key) === request) rangeRequests.delete(key);
  });
  return promise;
}

export type CalendarRefreshOptions = { force?: boolean };

export function useCalendarEvents(start: string, end: string, enabled = true) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const fetchEvents = useCallback(
    async (options: CalendarRefreshOptions = {}) => {
      const requestId = ++requestIdRef.current;
      if (!enabled) {
        setEvents([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await getRangeEvents(start, end, options.force);
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
    },
    [start, end, enabled]
  );

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

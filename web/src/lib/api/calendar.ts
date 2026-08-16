import type {
  CalendarEvent,
  CalendarOAuthStatus,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/types';
import { apiUrl } from '@/lib/apiUrl';
import { fetcher } from './client';

export const calendarApi = {
  getEvents: (start: string, end: string) =>
    fetcher<{ events: CalendarEvent[] }>(
      `/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    ),

  createEvent: (body: CreateCalendarEventInput) =>
    fetcher<{ id: string }>('/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateEvent: (id: string, body: UpdateCalendarEventInput) =>
    fetcher<{ message: string }>(`/api/calendar/events/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteEvent: (id: string) =>
    fetcher<{ message: string }>(`/api/calendar/events/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getOAuthStatus: () => fetcher<CalendarOAuthStatus>('/api/calendar/oauth/status'),

  disconnect: () =>
    fetcher<{ message: string }>('/api/calendar/oauth/disconnect', { method: 'POST' }),

  // Not a fetch — GET /oauth/start returns a 307 redirect.
  // Frontend navigates to this URL to trigger the OAuth flow.
  getOAuthStartUrl: () => apiUrl('/api/calendar/oauth/start'),
};
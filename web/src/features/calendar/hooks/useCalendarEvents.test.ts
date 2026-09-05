import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { CalendarEvent } from '@/types';
import { useCalendarEvents } from './useCalendarEvents';

vi.mock('@/lib/api', () => ({
  api: {
    calendar: {
      getEvents: vi.fn(),
    },
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const event = (id: string, start: string): CalendarEvent => ({
  id,
  title: id,
  start,
  end: start,
});

describe('useCalendarEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the newest range when an older request resolves last', async () => {
    const oldRange = deferred<{ events: CalendarEvent[] }>();
    const currentRange = deferred<{ events: CalendarEvent[] }>();
    vi.mocked(api.calendar.getEvents)
      .mockReturnValueOnce(oldRange.promise)
      .mockReturnValueOnce(currentRange.promise);

    const { result, rerender } = renderHook(({ start, end }) => useCalendarEvents(start, end), {
      initialProps: { start: '2026-09-01', end: '2026-10-13' },
    });

    rerender({ start: '2026-08-30', end: '2026-09-06' });
    const expected = [event('sunday', '2026-08-30T09:00:00Z')];
    await act(async () => currentRange.resolve({ events: expected }));
    await waitFor(() => expect(result.current.events).toEqual(expected));

    await act(async () => oldRange.resolve({ events: [event('tuesday', '2026-09-01T09:00:00Z')] }));
    expect(result.current.events).toEqual(expected);
  });

  it('does not request events while loading is disabled', async () => {
    const { result } = renderHook(() => useCalendarEvents('start', 'end', false));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.calendar.getEvents).not.toHaveBeenCalled();
    expect(result.current.events).toEqual([]);
  });

  it('updates an event locally without waiting for a refetch', async () => {
    vi.mocked(api.calendar.getEvents).mockResolvedValue({
      events: [event('planning', '2026-09-01T09:00:00Z')],
    });
    const { result } = renderHook(() => useCalendarEvents('start', 'end'));
    await waitFor(() => expect(result.current.events).toHaveLength(1));

    act(() => {
      result.current.updateEventLocally('planning', {
        start: '2026-09-02T10:15:00Z',
        end: '2026-09-02T11:15:00Z',
      });
    });

    expect(result.current.events[0]?.start).toBe('2026-09-02T10:15:00Z');
    expect(api.calendar.getEvents).toHaveBeenCalledOnce();
  });
});

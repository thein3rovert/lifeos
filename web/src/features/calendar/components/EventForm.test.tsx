import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { CalendarEvent } from '@/types';
import { EventForm } from './EventForm';

vi.mock('@/lib/api', () => ({
  api: {
    calendar: {
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
    },
  },
}));

vi.mock('@/components/ui/Toast', () => ({ toast: vi.fn() }));

const event: CalendarEvent = {
  id: 'event-1',
  title: 'Planning',
  start: '2026-09-01T09:00:00.000Z',
  end: '2026-09-01T10:00:00.000Z',
  description: 'Weekly plan',
  location: 'Desk',
};

describe('EventForm duplication', () => {
  beforeEach(() => vi.clearAllMocks());

  it('duplicates an existing event without re-entering details', async () => {
    vi.mocked(api.calendar.createEvent).mockResolvedValue({ id: 'copy-1' });
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<EventForm isOpen event={event} onSaved={onSaved} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

    await waitFor(() =>
      expect(api.calendar.createEvent).toHaveBeenCalledWith({
        title: event.title,
        start: event.start,
        end: event.end,
        description: event.description,
        location: event.location,
      })
    );
    expect(onSaved).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('uses 15-minute steps for event time inputs', () => {
    const { container } = render(
      <EventForm isOpen event={event} onSaved={vi.fn()} onClose={vi.fn()} />
    );
    const inputs = container.querySelectorAll('input[type="datetime-local"]');
    expect(inputs[0]?.getAttribute('step')).toBe('900');
    expect(inputs[1]?.getAttribute('step')).toBe('900');
  });
});

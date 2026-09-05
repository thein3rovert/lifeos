import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => cleanup());

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

  it('creates a weekly recurring event on selected weekdays', async () => {
    vi.mocked(api.calendar.createEvent).mockResolvedValue({ id: 'recurring-1' });
    render(
      <EventForm
        isOpen
        event={null}
        initialStart={new Date(2026, 8, 7, 9)}
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Event title'), { target: { value: 'Gym' } });
    fireEvent.click(screen.getByLabelText('Repeat weekly'));
    fireEvent.click(screen.getByRole('button', { name: 'WE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(api.calendar.createEvent).toHaveBeenCalled());
    expect(vi.mocked(api.calendar.createEvent).mock.calls[0]?.[0].recurrence?.weekdays).toEqual([
      'MO',
      'WE',
    ]);
  });

  it('targets the recurring series when editing and the user confirms', async () => {
    vi.mocked(api.calendar.updateEvent).mockResolvedValue({ message: 'updated' });
    render(
      <EventForm
        isOpen
        event={{
          ...event,
          recurrence: { seriesId: 'series-1', rules: ['RRULE:FREQ=WEEKLY;BYDAY=TU'] },
        }}
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Entire series' }));
    await waitFor(() => expect(api.calendar.updateEvent).toHaveBeenCalled());
    expect(api.calendar.updateEvent).toHaveBeenCalledWith('series-1', expect.any(Object));
  });
});

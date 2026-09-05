import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CalendarEvent } from '@/types';
import { WeekView } from './WeekView';

const event: CalendarEvent = {
  id: 'event-1',
  title: 'Planning',
  start: new Date(2026, 8, 1, 9).toISOString(),
  end: new Date(2026, 8, 1, 10).toISOString(),
};

function dataTransfer() {
  const data = new Map<string, string>();
  return {
    dropEffect: 'none',
    effectAllowed: 'none',
    setData: (type: string, value: string) => data.set(type, value),
    getData: (type: string) => data.get(type) ?? '',
  };
}

describe('WeekView interactions', () => {
  it('shows a destination preview with target day and time', () => {
    const { container } = render(
      <WeekView
        viewDate={new Date(2026, 8, 1)}
        events={[event]}
        onSlotClick={vi.fn()}
        onEventClick={vi.fn()}
        onEventTimingChange={vi.fn().mockResolvedValue(true)}
      />
    );
    const transfer = dataTransfer();
    fireEvent.dragStart(screen.getByText('Planning').closest('button') as HTMLElement, {
      dataTransfer: transfer,
    });
    const target = container.querySelector<HTMLElement>('[data-calendar-day="2026-09-02"]');
    expect(target).not.toBeNull();
    vi.spyOn(target as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 864,
      width: 100,
      height: 864,
      toJSON: () => ({}),
    });
    const dragOver = createEvent.dragOver(target as HTMLElement);
    Object.defineProperties(dragOver, {
      clientY: { value: 216 },
      dataTransfer: { value: transfer },
    });
    fireEvent(target as HTMLElement, dragOver);
    expect(screen.getByRole('status').textContent).toContain('Wednesday');
    expect(screen.getByRole('status').textContent).toMatch(/AM/);
  });
});

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Habit, HabitDay } from '@/types';
import { HabitMonthView } from './HabitMonthView';
import { HabitTableView } from './HabitTableView';

const habits: Habit[] = [
  {
    id: 'read',
    name: 'Read',
    description: '',
    color: '#2563eb',
    icon: 'book',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'run',
    name: 'Run',
    description: '',
    color: '#059669',
    icon: 'sun',
    createdAt: '',
    updatedAt: '',
  },
];
const day = (date: string, id = date): HabitDay => ({ id, date, createdAt: '' });

describe('habit views', () => {
  afterEach(() => cleanup());

  it('shows cards only on persisted days with every active habit', () => {
    render(
      <HabitMonthView
        viewDate={new Date(2026, 8, 1)}
        habits={habits}
        habitDays={[day('2026-09-07')]}
        completedKeys={new Set()}
        onToggle={vi.fn()}
        onAddHabit={vi.fn()}
      />
    );
    const persisted = screen.getByTestId('habit-day-2026-09-07');
    expect(within(persisted).getAllByRole('checkbox')).toHaveLength(2);
    expect(within(persisted).getByLabelText('0% complete')).not.toBeNull();
    expect(within(screen.getByTestId('habit-day-2026-09-08')).queryByRole('checkbox')).toBeNull();
  });

  it('paginates only persisted rows at ten rows per page', () => {
    render(
      <HabitTableView
        viewDate={new Date(2026, 8, 1)}
        habits={habits}
        habitDays={Array.from({ length: 11 }, (_, index) =>
          day(`2026-09-${String(index + 1).padStart(2, '0')}`)
        )}
        completedKeys={new Set()}
        onToggle={vi.fn()}
      />
    );
    expect(screen.getAllByTestId(/^habit-table-row-/)).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getAllByTestId(/^habit-table-row-/)).toHaveLength(1);
  });

  it('reflects one completion state across month and table', () => {
    function SharedViews() {
      const [view, setView] = useState<'month' | 'table'>('month');
      const [completed, setCompleted] = useState(new Set<string>());
      const toggle = (habitId: string, date: string) =>
        setCompleted(new Set([`${habitId}:${date}`]));
      return (
        <>
          <button type="button" onClick={() => setView('table')}>
            Show table
          </button>
          {view === 'month' ? (
            <HabitMonthView
              viewDate={new Date(2026, 8, 1)}
              habits={habits}
              habitDays={[day('2026-09-07')]}
              completedKeys={completed}
              onToggle={toggle}
              onAddHabit={vi.fn()}
            />
          ) : (
            <HabitTableView
              viewDate={new Date(2026, 8, 1)}
              habits={habits}
              habitDays={[day('2026-09-07')]}
              completedKeys={completed}
              onToggle={toggle}
            />
          )}
        </>
      );
    }
    render(<SharedViews />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Read on 2026-09-07' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show table' }));
    expect(
      (screen.getByRole('checkbox', { name: 'Read on 2026-09-07' }) as HTMLInputElement).checked
    ).toBe(true);
  });
});

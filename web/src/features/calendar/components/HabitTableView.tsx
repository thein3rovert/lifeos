import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { habitCompletionKey } from '@/features/calendar/utils';
import type { Habit, HabitDay } from '@/types';

const PAGE_SIZE = 10;

type HabitTableViewProps = {
  viewDate: Date;
  habits: Habit[];
  habitDays: HabitDay[];
  completedKeys: Set<string>;
  onToggle: (habitId: string, date: string) => void | Promise<void>;
};

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function HabitTableView({
  viewDate,
  habits,
  habitDays,
  completedKeys,
  onToggle,
}: HabitTableViewProps) {
  const [page, setPage] = useState(0);
  const monthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  const visibleDates = habitDays
    .map((day) => day.date)
    .filter((date) => date.startsWith(monthPrefix));
  const pageCount = Math.max(1, Math.ceil(visibleDates.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageDates = visibleDates.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  return (
    <div className="rounded-lg border border-default bg-raised">
      <div className="overflow-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[100px_180px_minmax(240px,1fr)_180px_100px] border-b border-subtle bg-input text-xs font-medium text-secondary">
            <div className="px-3 py-2">Day</div>
            <div className="border-l border-subtle px-3 py-2">Date</div>
            <div className="border-l border-subtle px-3 py-2">Habits</div>
            <div className="border-l border-subtle px-3 py-2">Progress</div>
            <div className="border-l border-subtle px-3 py-2 text-center">Completed</div>
          </div>
          {pageDates.map((dateKey) => {
            const date = dateFromKey(dateKey);
            const completed = habits.filter((habit) =>
              completedKeys.has(habitCompletionKey(habit.id, dateKey))
            ).length;
            const percent = habits.length ? Math.round((completed / habits.length) * 100) : 0;

            return (
              <div
                key={dateKey}
                data-testid={`habit-table-row-${dateKey}`}
                className="grid grid-cols-[100px_180px_minmax(240px,1fr)_180px_100px] border-b border-subtle text-xs text-secondary last:border-b-0"
              >
                <div className="px-3 py-3 text-primary">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="border-l border-subtle px-3 py-3">
                  {date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="flex flex-wrap gap-2 border-l border-subtle px-3 py-2">
                  {habits.map((habit) => {
                    const checked = completedKeys.has(habitCompletionKey(habit.id, dateKey));
                    return (
                      <label
                        key={habit.id}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-input px-2 py-1 text-secondary"
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => void onToggle(habit.id, dateKey)}
                          aria-label={`${habit.name} on ${dateKey}`}
                        />
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? 'border-transparent text-white' : 'border-subtle'}`}
                          style={
                            checked ? { backgroundColor: habit.color } : { color: habit.color }
                          }
                        >
                          {checked && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                        </span>
                        <span>{habit.name}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="border-l border-subtle px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base">
                      <div className="h-full bg-highlight" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-tertiary">{percent}%</span>
                  </div>
                </div>
                <div className="border-l border-subtle px-3 py-3 text-center text-tertiary">
                  {completed}/{habits.length}
                </div>
              </div>
            );
          })}
          {visibleDates.length === 0 && (
            <div className="px-4 py-12 text-center text-xs text-tertiary">
              No tracking days yet. Click New to add today.
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-subtle px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
          disabled={currentPage === 0}
          onClick={() => setPage((current) => current - 1)}
        >
          Prev
        </Button>
        <span className="min-w-20 text-center text-xs text-tertiary">
          Page {currentPage + 1} of {pageCount}
        </span>
        <Button
          variant="ghost"
          size="sm"
          rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
          disabled={currentPage >= pageCount - 1}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

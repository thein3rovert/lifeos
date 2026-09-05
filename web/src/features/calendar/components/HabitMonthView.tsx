import { Check, CheckSquare2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  buildMonthGrid,
  habitCompletionKey,
  isToday,
  toLocalDateKey,
} from '@/features/calendar/utils';
import type { Habit, HabitDay } from '@/types';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type HabitMonthViewProps = {
  viewDate: Date;
  habits: Habit[];
  habitDays: HabitDay[];
  completedKeys: Set<string>;
  onToggle: (habitId: string, date: string) => void | Promise<void>;
  onAddHabit: () => void;
  managementCollapsed?: boolean;
};

export function HabitMonthView({
  viewDate,
  habits,
  habitDays,
  completedKeys,
  onToggle,
  onAddHabit,
  managementCollapsed = false,
}: HabitMonthViewProps) {
  const days = buildMonthGrid(viewDate);
  const currentMonth = viewDate.getMonth();
  const persistedDates = new Set(habitDays.map((day) => day.date));

  return (
    <div className="relative overflow-hidden rounded-lg border border-default bg-raised">
      <div className="grid grid-cols-7 border-b border-default">
        {DAY_HEADERS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-tertiary">
            {day}
          </div>
        ))}
      </div>
      <div
        className={`grid min-h-[540px] grid-cols-7 grid-rows-6 ${managementCollapsed ? 'md:h-[calc(100vh-225px)]' : 'md:h-[calc(100vh-390px)]'} md:min-h-[540px]`}
      >
        {days.map((date) => {
          const current = date.getMonth() === currentMonth;
          const dateKey = toLocalDateKey(date);
          const dayHabits = persistedDates.has(dateKey) ? habits : [];
          const completed = dayHabits.filter((habit) =>
            completedKeys.has(habitCompletionKey(habit.id, dateKey))
          ).length;
          const percent = dayHabits.length ? Math.round((completed / dayHabits.length) * 100) : 0;

          return (
            <div
              key={dateKey}
              data-testid={`habit-day-${dateKey}`}
              className={`min-h-0 overflow-y-auto border-r border-b border-default p-2 ${current ? 'bg-raised' : 'bg-base'}`}
            >
              <div className="flex items-center justify-between gap-2">
                {dayHabits.length > 0 ? (
                  <span className="text-[10px] text-tertiary">{percent}%</span>
                ) : (
                  <span />
                )}
                <span
                  className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
                    isToday(date)
                      ? 'bg-highlight text-white'
                      : current
                        ? 'text-secondary'
                        : 'text-tertiary'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              <div className="mt-1 space-y-1">
                {dayHabits.map((habit) => {
                  const checked = completedKeys.has(habitCompletionKey(habit.id, dateKey));
                  return (
                    <label
                      key={habit.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors ${checked ? 'text-white' : 'bg-input text-secondary hover:bg-hover'}`}
                      style={checked ? { backgroundColor: habit.color } : undefined}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => void onToggle(habit.id, dateKey)}
                        aria-label={`${habit.name} on ${dateKey}`}
                      />
                      <span
                        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-current"
                        style={!checked ? { color: habit.color } : undefined}
                      >
                        {checked && <Check className="h-3 w-3" strokeWidth={2.5} />}
                      </span>
                      <span className="truncate">{habit.name}</span>
                    </label>
                  );
                })}
              </div>
              {dayHabits.length > 0 && (
                <div
                  className="mt-2 h-1 overflow-hidden rounded-full bg-base"
                  role="progressbar"
                  aria-label={`${percent}% complete`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <div
                    className="h-full bg-highlight transition-[width]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {habits.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-48 flex justify-center">
          <div className="pointer-events-auto flex max-w-sm flex-col items-center rounded-lg border border-default bg-raised/95 p-6 text-center shadow-lg">
            <CheckSquare2 className="mb-3 h-8 w-8 text-tertiary" />
            <p className="text-sm font-medium text-primary">No habits yet</p>
            <p className="mt-1 text-xs text-tertiary">Add a habit to track it across your month.</p>
            <Button
              className="mt-4"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={onAddHabit}
            >
              Add habit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

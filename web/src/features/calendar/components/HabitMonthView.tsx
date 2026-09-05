import { CheckSquare2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { buildMonthGrid, isToday } from '@/features/calendar/utils';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HabitMonthView({ viewDate }: { viewDate: Date }) {
  const days = buildMonthGrid(viewDate);
  const currentMonth = viewDate.getMonth();

  return (
    <div className="overflow-hidden rounded-lg border border-default bg-raised">
      <div className="grid grid-cols-7 border-b border-default">
        {DAY_HEADERS.map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-tertiary">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((date) => {
          const current = date.getMonth() === currentMonth;
          return (
            <div
              key={date.toISOString()}
              className={`min-h-32 border-r border-b border-default p-2 ${current ? 'bg-raised' : 'bg-base'}`}
            >
              <div className="flex justify-end">
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
            </div>
          );
        })}
      </div>
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
          >
            Add habit
          </Button>
        </div>
      </div>
    </div>
  );
}

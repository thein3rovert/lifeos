import { CheckSquare2 } from 'lucide-react';

export function HabitTableView({ viewDate }: { viewDate: Date }) {
  const days = Array.from(
    { length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() },
    (_, index) => new Date(viewDate.getFullYear(), viewDate.getMonth(), index + 1)
  ).reverse();

  return (
    <div className="relative overflow-auto rounded-lg border border-default bg-raised">
      <div className="grid min-w-[720px] grid-cols-[120px_180px_1fr_120px] border-b border-default bg-input text-xs font-medium text-secondary">
        <div className="px-3 py-2">Day</div>
        <div className="border-l border-default px-3 py-2">Date</div>
        <div className="border-l border-default px-3 py-2">Progress</div>
        <div className="border-l border-default px-3 py-2 text-center">Completed</div>
      </div>
      <div className="min-w-[720px]">
        {days.map((date) => (
          <div
            key={date.toISOString()}
            className="grid grid-cols-[120px_180px_1fr_120px] border-b border-default text-xs text-secondary hover:bg-hover"
          >
            <div className="px-3 py-3 text-primary">
              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="border-l border-default px-3 py-3">
              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="border-l border-default px-3 py-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-base">
                  <div className="h-full w-0 bg-highlight" />
                </div>
                <span className="text-tertiary">0%</span>
              </div>
            </div>
            <div className="border-l border-default px-3 py-3 text-center text-tertiary">0</div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-28 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-default bg-raised/95 px-4 py-3 text-xs text-tertiary shadow-lg">
          <CheckSquare2 className="h-4 w-4" /> Habit columns will appear here after you add habits
        </div>
      </div>
    </div>
  );
}

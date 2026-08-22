import { buildMonthGrid, isToday } from '@/features/calendar';
import type { CalendarEvent } from '@/types';

type MonthViewProps = {
  viewDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_EVENTS = 3;

export function MonthView({ viewDate, events, onDayClick, onEventClick }: MonthViewProps) {
  const grid = buildMonthGrid(viewDate);
  const currentMonth = viewDate.getMonth();

  // Group events by day (fast lookup).
  const eventsByDay = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const eventDate = new Date(event.start);
    const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-default">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-tertiary py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid — 6 rows × 7 cols */}
      <div className="grid grid-cols-7 grid-rows-6">
        {grid.map((date, i) => {
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isCurrentMonth = date.getMonth() === currentMonth;
          const today = isToday(date);
          const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(date)}
              className={`text-left min-h-[100px] border-r border-b border-default p-1.5 hover:bg-hover transition-colors ${
                isCurrentMonth ? 'bg-raised' : 'bg-base'
              } ${today ? 'ring-1 ring-inset ring-highlight' : ''}`}
            >
              {/* Day number */}
              <div
                className={`text-xs mb-1 ${
                  today
                    ? 'text-primary font-semibold'
                    : isCurrentMonth
                      ? 'text-secondary'
                      : 'text-tertiary'
                }`}
              >
                {date.getDate()}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  />
                ))}
                {hiddenCount > 0 && (
                  <div className="text-xs text-tertiary pl-1">
                    +{hiddenCount} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventChip({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-1.5 py-0.5 rounded text-xs bg-highlight/25 text-primary truncate hover:bg-highlight/40 transition-colors"
    >
      {event.title || '(untitled)'}
    </button>
  );
}

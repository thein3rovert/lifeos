import { buildWeekGrid, isSameDay, isToday } from '@/features/calendar';
import type { CalendarEvent } from '@/types';

type WeekViewProps = {
  viewDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_HEIGHT = 48; // px per hour
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export function WeekView({ viewDate, events, onSlotClick, onEventClick }: WeekViewProps) {
  const days = buildWeekGrid(viewDate);

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-default">
        <div /> {/* empty cell above time column */}
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`text-center py-2 border-l border-default ${
                today ? 'bg-selected' : ''
              }`}
            >
              <div className="text-xs text-tertiary">{DAY_HEADERS[day.getDay()]}</div>
              <div
                className={`text-sm ${today ? 'text-primary font-semibold' : 'text-secondary'}`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div
        className="grid grid-cols-[60px_repeat(7,1fr)]"
        style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
      >
        {/* Hour labels column */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-1 text-xs text-tertiary"
              style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT - 6}px` }}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            events={events.filter((e) => isSameDay(new Date(e.start), day))}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  day,
  events,
  onSlotClick,
  onEventClick,
}: {
  day: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <div className="relative border-l border-default">
      {/* Hour slots (clickable) */}
      {HOURS.map((hour) => (
        <button
          key={hour}
          type="button"
          onClick={() => onSlotClick(day, hour)}
          className="w-full border-b border-subtle hover:bg-hover transition-colors block"
          style={{ height: `${HOUR_HEIGHT}px` }}
          aria-label={`Create event at ${formatHour(hour)}`}
        />
      ))}

      {/* Events (absolutely positioned) */}
      {events.map((event) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const startOffset = start.getHours() + start.getMinutes() / 60;
        const endOffset = end.getHours() + end.getMinutes() / 60;

        if (endOffset <= START_HOUR || startOffset >= END_HOUR + 1) return null;

        const top = Math.max(0, (startOffset - START_HOUR) * HOUR_HEIGHT);
        const height = Math.max(20, (endOffset - startOffset) * HOUR_HEIGHT);

        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onEventClick(event)}
            className="absolute left-1 right-1 rounded px-1.5 py-0.5 text-xs bg-highlight/40 text-primary text-left overflow-hidden hover:bg-highlight/60 transition-colors"
            style={{ top: `${top}px`, height: `${height}px` }}
          >
            <div className="font-medium truncate">{event.title || '(untitled)'}</div>
            <div className="text-tertiary text-[10px]">
              {formatTimeShort(event.start)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display} ${period}`;
}

function formatTimeShort(timeStr: string): string {
  const d = new Date(timeStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

import { useEffect, useState } from 'react';
import { buildWeekGrid, isSameDay, isToday } from '@/features/calendar';
import type { CalendarEvent } from '@/types';

type WeekViewProps = {
  viewDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove: (eventId: string, newStart: Date, newEnd: Date) => void;
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_HEIGHT = 48; // px per hour
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

export function WeekView({
  viewDate,
  events,
  onSlotClick,
  onEventClick,
  onEventMove,
}: WeekViewProps) {
  const days = buildWeekGrid(viewDate);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="w-full">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-default">
        <div />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`text-center py-2 border-l border-default ${today ? 'bg-selected' : ''}`}
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
            draggingId={draggingId}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
            onEventDragStart={setDraggingId}
            onEventDragEnd={() => setDraggingId(null)}
            onEventMove={onEventMove}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  day,
  events,
  draggingId,
  onSlotClick,
  onEventClick,
  onEventDragStart,
  onEventDragEnd,
  onEventMove,
}: {
  day: Date;
  events: CalendarEvent[];
  draggingId: string | null;
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDragStart: (id: string) => void;
  onEventDragEnd: () => void;
  onEventMove: (eventId: string, newStart: Date, newEnd: Date) => void;
}) {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  const showNowLine = isSameDay(day, now);
  const nowOffset = now.getHours() + now.getMinutes() / 60;
  const nowTop = (nowOffset - START_HOUR) * HOUR_HEIGHT;
  const nowVisible = showNowLine && nowOffset >= START_HOUR && nowOffset <= END_HOUR + 1;

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverHour(null);
    const eventId = e.dataTransfer.getData('eventId');
    const durationMs = Number.parseInt(e.dataTransfer.getData('duration'), 10);
    if (!eventId || !durationMs) return;
    const newStart = new Date(day);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);
    onEventMove(eventId, newStart, newEnd);
  };

  return (
    <div className="relative border-l border-default">
      {/* Hour slots (clickable + drop targets) */}
      {HOURS.map((hour) => (
        <button
          key={hour}
          type="button"
          onClick={() => onSlotClick(day, hour)}
          onDragOver={(e) => {
            if (!draggingId) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDragOverHour(hour);
          }}
          onDragLeave={() => setDragOverHour((h) => (h === hour ? null : h))}
          onDrop={(e) => handleDrop(e, hour)}
          className={`w-full border-b border-subtle transition-colors block ${
            dragOverHour === hour ? 'bg-selected' : 'hover:bg-hover'
          }`}
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
        const isDragging = draggingId === event.id;

        return (
          <button
            key={event.id}
            type="button"
            draggable
            onClick={() => onEventClick(event)}
            onDragStart={(e) => {
              const durationMs = end.getTime() - start.getTime();
              e.dataTransfer.setData('eventId', event.id);
              e.dataTransfer.setData('duration', String(durationMs));
              e.dataTransfer.effectAllowed = 'move';
              onEventDragStart(event.id);
            }}
            onDragEnd={() => onEventDragEnd()}
            className={`absolute left-1 right-1 rounded-md px-2 py-1 text-xs bg-highlight/40 text-primary text-left overflow-hidden hover:bg-highlight/60 transition-colors border border-highlight/30 shadow-sm cursor-grab active:cursor-grabbing ${
              isDragging ? 'opacity-40' : ''
            }`}
            style={{
              top: `${top + 2}px`,
              height: `${Math.max(20, height - 4)}px`,
            }}
          >
            <div className="font-medium truncate leading-tight">
              {event.title || '(untitled)'}
            </div>
            <div className="text-tertiary text-[10px] mt-0.5">{formatTimeShort(event.start)}</div>
          </button>
        );
      })}

      {/* Current-time indicator (only on today's column) */}
      {nowVisible && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-10"
          style={{ top: `${nowTop}px` }}
        >
          <div className="relative">
            <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-error" />
            <div className="h-px bg-error" />
          </div>
        </div>
      )}
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

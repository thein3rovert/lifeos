import { useState } from 'react';
import { buildMonthGrid, isToday } from '@/features/calendar';
import type { CalendarEvent } from '@/types';

type MonthViewProps = {
  viewDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove: (eventId: string, newStart: Date, newEnd: Date) => void;
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_EVENTS = 3;

export function MonthView({
  viewDate,
  events,
  onDayClick,
  onEventClick,
  onEventMove,
}: MonthViewProps) {
  const grid = buildMonthGrid(viewDate);
  const currentMonth = viewDate.getMonth();

  // Track which day is being hovered during a drag (for visual feedback).
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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
          <div key={day} className="text-center text-xs font-medium text-tertiary py-2">
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
          const isDragOver = dragOverKey === key;

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(date)}
              onDragOver={(e) => {
                if (!draggingId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverKey(key);
              }}
              onDragLeave={() => setDragOverKey((k) => (k === key ? null : k))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverKey(null);
                const eventId = e.dataTransfer.getData('eventId');
                const durationMs = Number.parseInt(e.dataTransfer.getData('duration'), 10);
                if (!eventId || !durationMs) return;
                const source = events.find((ev) => ev.id === eventId);
                if (!source) return;
                const oldStart = new Date(source.start);
                const newStart = new Date(date);
                newStart.setHours(
                  oldStart.getHours(),
                  oldStart.getMinutes(),
                  0,
                  0
                );
                const newEnd = new Date(newStart.getTime() + durationMs);
                onEventMove(eventId, newStart, newEnd);
              }}
              className={`text-left min-h-[100px] border-r border-b border-default p-1.5 transition-colors ${
                isCurrentMonth ? 'bg-raised' : 'bg-base'
              } ${today ? 'ring-1 ring-inset ring-highlight' : ''} ${
                isDragOver ? 'bg-selected' : 'hover:bg-hover'
              }`}
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
              <div className="space-y-1">
                {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    isDragging={draggingId === event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    onDragStart={(e) => {
                      const durationMs =
                        new Date(event.end).getTime() - new Date(event.start).getTime();
                      e.dataTransfer.setData('eventId', event.id);
                      e.dataTransfer.setData('duration', String(durationMs));
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggingId(event.id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverKey(null);
                    }}
                  />
                ))}
                {hiddenCount > 0 && (
                  <div className="text-xs text-tertiary pl-1 pt-0.5">+{hiddenCount} more</div>
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
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  event: CalendarEvent;
  isDragging: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`w-full text-left px-1.5 py-0.5 rounded text-xs bg-highlight/25 text-primary truncate hover:bg-highlight/40 transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {event.title || '(untitled)'}
    </button>
  );
}

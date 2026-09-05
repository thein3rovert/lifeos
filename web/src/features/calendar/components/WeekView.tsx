import { useEffect, useState } from 'react';
import {
  buildWeekGrid,
  dateAtMinutes,
  formatEventTimeRange,
  isSameDay,
  isToday,
  resizedEventEnd,
  snapMinutes,
} from '@/features/calendar/utils';
import type { CalendarEvent } from '@/types';

type TimingOperation = 'move' | 'resize';
type TimingChange = (
  eventId: string,
  newStart: Date,
  newEnd: Date,
  operation?: TimingOperation
) => Promise<boolean>;

type WeekViewProps = {
  viewDate: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventTimingChange: TimingChange;
};

type TimingPreview = {
  event: CalendarEvent;
  start: Date;
  end: Date;
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_HEIGHT = 48;
const START_HOUR = 6;
const END_HOUR = 23;
const GRID_END_HOUR = END_HOUR + 1;
const HOURS = Array.from({ length: GRID_END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export function WeekView({
  viewDate,
  events,
  onSlotClick,
  onEventClick,
  onEventTimingChange,
}: WeekViewProps) {
  const days = buildWeekGrid(viewDate);
  const [dragging, setDragging] = useState<CalendarEvent | null>(null);
  const [preview, setPreview] = useState<TimingPreview | null>(null);

  const updateDragPreview = (event: React.DragEvent<HTMLDivElement>, day: Date) => {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const rawMinutes = START_HOUR * 60 + (y / rect.height) * HOURS.length * 60;
    const durationMs = new Date(dragging.end).getTime() - new Date(dragging.start).getTime();
    if (durationMs <= 0) return;
    const durationMinutes = durationMs / 60_000;
    const latestStart = GRID_END_HOUR * 60 - durationMinutes;
    const startMinutes = Math.max(START_HOUR * 60, Math.min(latestStart, snapMinutes(rawMinutes)));
    const start = dateAtMinutes(day, startMinutes);
    setPreview({ event: dragging, start, end: new Date(start.getTime() + durationMs) });
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!preview) return;
    const current = preview;
    await onEventTimingChange(current.event.id, current.start, current.end, 'move');
    setPreview(null);
    setDragging(null);
  };

  return (
    <div className="w-full">
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
              <div className={`text-sm ${today ? 'text-primary font-semibold' : 'text-secondary'}`}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="grid grid-cols-[60px_repeat(7,1fr)]"
        style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
      >
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

        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            events={events.filter((item) => isSameDay(new Date(item.start), day))}
            draggingId={dragging?.id ?? null}
            preview={preview && isSameDay(preview.start, day) ? preview : null}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
            onEventDragStart={(item) => {
              setDragging(item);
              setPreview(null);
            }}
            onEventDragEnd={() => {
              setDragging(null);
              setPreview(null);
            }}
            onDragOver={(event) => updateDragPreview(event, day)}
            onDrop={handleDrop}
            onEventTimingChange={onEventTimingChange}
          />
        ))}
      </div>
      {preview && (
        <div className="sr-only" role="status" aria-live="polite">
          Moving {preview.event.title} to{' '}
          {preview.start.toLocaleDateString('en-US', { weekday: 'long' })},{' '}
          {formatEventTimeRange(preview.start, preview.end)}
        </div>
      )}
    </div>
  );
}

type DayColumnProps = {
  day: Date;
  events: CalendarEvent[];
  draggingId: string | null;
  preview: TimingPreview | null;
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventDragStart: (event: CalendarEvent) => void;
  onEventDragEnd: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onEventTimingChange: TimingChange;
};

function DayColumn({
  day,
  events,
  draggingId,
  preview,
  onSlotClick,
  onEventClick,
  onEventDragStart,
  onEventDragEnd,
  onDragOver,
  onDrop,
  onEventTimingChange,
}: DayColumnProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const nowOffset = now.getHours() + now.getMinutes() / 60;
  const nowVisible = isSameDay(day, now) && nowOffset >= START_HOUR && nowOffset <= GRID_END_HOUR;

  return (
    // The column is a native drag-and-drop target; keyboard event editing is
    // provided through the event form rather than an equivalent drop gesture.
    // biome-ignore lint/a11y/noStaticElementInteractions: HTML has no semantic drop-zone element.
    <div
      className="relative border-l border-default"
      data-calendar-day={`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {HOURS.map((hour) => (
        <button
          key={hour}
          type="button"
          onClick={() => onSlotClick(day, hour)}
          className="w-full border-b border-subtle transition-colors block hover:bg-hover"
          style={{ height: `${HOUR_HEIGHT}px` }}
          aria-label={`Create event at ${formatHour(hour)}`}
        />
      ))}

      {events.map((event) => (
        <EventBlock
          key={event.id}
          event={event}
          isDragging={draggingId === event.id}
          onClick={() => onEventClick(event)}
          onDragStart={() => onEventDragStart(event)}
          onDragEnd={onEventDragEnd}
          onEventTimingChange={onEventTimingChange}
        />
      ))}

      {preview && <PreviewBlock preview={preview} />}

      {nowVisible && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-20"
          style={{ top: `${(nowOffset - START_HOUR) * HOUR_HEIGHT}px` }}
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

function EventBlock({
  event,
  isDragging,
  onClick,
  onDragStart,
  onDragEnd,
  onEventTimingChange,
}: {
  event: CalendarEvent;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEventTimingChange: TimingChange;
}) {
  const originalStart = new Date(event.start);
  const originalEnd = new Date(event.end);
  const [resizeEnd, setResizeEnd] = useState<Date | null>(null);
  const [resizing, setResizing] = useState(false);
  const [resizeOrigin, setResizeOrigin] = useState<{ clientY: number; end: Date } | null>(null);
  const displayEnd = resizeEnd ?? originalEnd;
  const startOffset = originalStart.getHours() + originalStart.getMinutes() / 60;
  const endOffset = displayEnd.getHours() + displayEnd.getMinutes() / 60;
  if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset)) return null;
  if (endOffset <= START_HOUR || startOffset >= GRID_END_HOUR) return null;

  const top = Math.max(0, (startOffset - START_HOUR) * HOUR_HEIGHT);
  const height = Math.max(20, (endOffset - startOffset) * HOUR_HEIGHT);

  const updateResize = (clientY: number) => {
    if (!resizeOrigin) return;
    const deltaMinutes = ((clientY - resizeOrigin.clientY) / HOUR_HEIGHT) * 60;
    const latestEnd = new Date(originalStart);
    latestEnd.setHours(GRID_END_HOUR, 0, 0, 0);
    setResizeEnd(resizedEventEnd(originalStart, resizeOrigin.end, deltaMinutes, latestEnd));
  };

  const finishResize = async (target: Element, pointerId: number) => {
    if (!resizeEnd) {
      setResizeOrigin(null);
      return;
    }
    target.releasePointerCapture?.(pointerId);
    setResizing(true);
    await onEventTimingChange(event.id, originalStart, resizeEnd, 'resize');
    setResizing(false);
    setResizeOrigin(null);
    setResizeEnd(null);
  };

  return (
    <div
      className={`absolute left-1 right-1 z-10 rounded-md bg-highlight/40 border border-highlight/30 shadow-sm overflow-hidden ${
        isDragging ? 'opacity-30' : ''
      } ${resizing ? 'animate-pulse' : ''}`}
      style={{ top: `${top + 2}px`, height: `${Math.max(20, height - 4)}px` }}
    >
      <button
        type="button"
        draggable={!resizeOrigin}
        onClick={onClick}
        onDragStart={(dragEvent) => {
          const durationMs = originalEnd.getTime() - originalStart.getTime();
          dragEvent.dataTransfer.setData('eventId', event.id);
          dragEvent.dataTransfer.setData('duration', String(durationMs));
          dragEvent.dataTransfer.effectAllowed = 'move';
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        className="absolute inset-0 w-full px-2 py-1 pb-3 text-xs text-primary text-left hover:bg-highlight/20 cursor-grab active:cursor-grabbing"
      >
        <div className="font-medium truncate leading-tight">{event.title || '(untitled)'}</div>
        <div className="text-tertiary text-[10px] mt-0.5">
          {formatEventTimeRange(originalStart, displayEnd)}
        </div>
      </button>
      <button
        type="button"
        aria-label={`Resize ${event.title || 'event'}`}
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-highlight/25 hover:bg-highlight/70 touch-none"
        onPointerDown={(pointerEvent) => {
          pointerEvent.preventDefault();
          pointerEvent.stopPropagation();
          pointerEvent.currentTarget.setPointerCapture?.(pointerEvent.pointerId);
          setResizeOrigin({ clientY: pointerEvent.clientY, end: originalEnd });
          setResizeEnd(originalEnd);
        }}
        onPointerMove={(pointerEvent) => {
          if (resizeOrigin) updateResize(pointerEvent.clientY);
        }}
        onPointerUp={(pointerEvent) => {
          pointerEvent.preventDefault();
          void finishResize(pointerEvent.currentTarget, pointerEvent.pointerId);
        }}
        onPointerCancel={() => {
          setResizeOrigin(null);
          setResizeEnd(null);
        }}
      />
    </div>
  );
}

function PreviewBlock({ preview }: { preview: TimingPreview }) {
  const startOffset = preview.start.getHours() + preview.start.getMinutes() / 60;
  const durationHours = (preview.end.getTime() - preview.start.getTime()) / 3_600_000;
  return (
    <div
      className="absolute left-1 right-1 z-30 pointer-events-none rounded-md border-2 border-dashed border-highlight bg-selected px-2 py-1 text-xs text-primary shadow-lg"
      style={{
        top: `${(startOffset - START_HOUR) * HOUR_HEIGHT + 2}px`,
        height: `${Math.max(24, durationHours * HOUR_HEIGHT - 4)}px`,
      }}
    >
      <div className="font-medium truncate">{preview.event.title || '(untitled)'}</div>
      <div className="text-[10px]">
        {preview.start.toLocaleDateString('en-US', { weekday: 'short' })} ·{' '}
        {formatEventTimeRange(preview.start, preview.end)}
      </div>
    </div>
  );
}

function formatHour(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display} ${period}`;
}

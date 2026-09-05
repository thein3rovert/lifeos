import { Copy, Repeat2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import {
  CALENDAR_INCREMENT_MINUTES,
  CALENDAR_WEEKDAYS,
  parseWeeklyRecurrence,
  weekdayToken,
} from '@/features/calendar/utils';
import { api } from '@/lib/api';
import type { CalendarEvent, CalendarWeekday } from '@/types';

type EventFormProps = {
  isOpen: boolean;
  event: CalendarEvent | null; // null = create, event = edit
  initialStart?: Date; // used in create mode for prefilled start time
  onClose: () => void;
  onSaved: () => void | Promise<void>; // called after successful mutation so parent can refetch
};

// Format a Date as "YYYY-MM-DDTHH:mm" for <input type="datetime-local">.
function toLocalDateTimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nextHour(d: Date): Date {
  const next = new Date(d);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

export function EventForm({ isOpen, event, initialStart, onClose, onSaved }: EventFormProps) {
  const isEdit = event !== null;

  const [title, setTitle] = useState('');
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [repeatsWeekly, setRepeatsWeekly] = useState(false);
  const [weekdays, setWeekdays] = useState<CalendarWeekday[]>([]);
  const [recurrenceEnd, setRecurrenceEnd] = useState<'never' | 'until'>('never');
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [pendingAction, setPendingAction] = useState<'edit' | 'delete' | null>(null);
  const mutating = saving || deleting || duplicating;

  // Reset form whenever the dialog opens or the event/initialStart changes.
  useEffect(() => {
    if (!isOpen) return;
    if (event) {
      setTitle(event.title || '');
      setStartStr(toLocalDateTimeInput(new Date(event.start)));
      setEndStr(toLocalDateTimeInput(new Date(event.end)));
      setDescription(event.description || '');
      setRepeatsWeekly(Boolean(event.recurrence));
      const parsed = parseWeeklyRecurrence(event.recurrence?.rules);
      setWeekdays(parsed.weekdays);
      setRecurrenceEnd(parsed.end);
      setRecurrenceUntil(parsed.until);
    } else {
      const start = initialStart ?? nextHour(new Date());
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setTitle('');
      setStartStr(toLocalDateTimeInput(start));
      setEndStr(toLocalDateTimeInput(end));
      setDescription('');
      setRepeatsWeekly(false);
      setWeekdays([weekdayToken(start)]);
      setRecurrenceEnd('never');
      setRecurrenceUntil('');
    }
  }, [isOpen, event, initialStart]);

  const handleSave = async (scope?: 'occurrence' | 'series') => {
    if (!title.trim()) {
      toast('Title is required', 'error');
      return;
    }
    if (!startStr || !endStr) {
      toast('Start and end times are required', 'error');
      return;
    }
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (end <= start) {
      toast('End must be after start', 'error');
      return;
    }

    setSaving(true);
    try {
      if (repeatsWeekly && weekdays.length === 0) {
        toast('Select at least one repeat day', 'error');
        return;
      }
      if (repeatsWeekly && recurrenceEnd === 'until' && !recurrenceUntil) {
        toast('Choose when the recurrence ends', 'error');
        return;
      }
      const body = {
        title: title.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
        description: description.trim() || undefined,
        ...(repeatsWeekly && (!isEdit || scope === 'series')
          ? {
              recurrence: {
                weekdays,
                end: recurrenceEnd,
                ...(recurrenceEnd === 'until' ? { until: recurrenceUntil } : {}),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            }
          : {}),
      };
      if (isEdit && event) {
        if (event.recurrence && !scope) {
          setPendingAction('edit');
          return;
        }
        const targetId = scope === 'series' ? event.recurrence?.seriesId : event.id;
        if (!targetId) return;
        await api.calendar.updateEvent(targetId, body);
        toast('Event updated', 'success');
      } else {
        await api.calendar.createEvent(body);
        toast('Event created', 'success');
      }
      await onSaved();
      onClose();
    } catch {
      toast(isEdit ? 'Failed to update event' : 'Failed to create event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scope?: 'occurrence' | 'series') => {
    if (!event) return;
    if (event.recurrence && !scope) {
      setPendingAction('delete');
      return;
    }
    const targetId = scope === 'series' ? event.recurrence?.seriesId : event.id;
    if (!targetId) return;
    if (!window.confirm('Delete this event? This cannot be undone.')) return;

    setDeleting(true);
    try {
      await api.calendar.deleteEvent(targetId);
      toast('Event deleted', 'success');
      await onSaved();
      onClose();
    } catch {
      toast('Failed to delete event', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!event) return;
    setDuplicating(true);
    try {
      await api.calendar.createEvent({
        title: event.title,
        start: event.start,
        end: event.end,
        description: event.description,
        location: event.location,
      });
      await onSaved();
      toast('Event duplicated', 'success');
      onClose();
    } catch {
      toast('Failed to duplicate event', 'error');
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="relative w-full max-w-dialog-md">
      <DialogHeader title={isEdit ? 'Edit event' : 'New event'} onClose={onClose} />
      <DialogBody>
        <div className="space-y-3">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            autoFocus
          />
          {event?.recurrence && (
            <div className="flex items-center gap-2 rounded-md border border-default bg-selected px-2.5 py-2 text-xs text-primary">
              <Repeat2 className="h-3.5 w-3.5" /> This event belongs to a recurring series
            </div>
          )}
          {(!isEdit || event?.recurrence) && (
            <div className="space-y-2 rounded-md border border-default p-3">
              <label className="flex items-center gap-2 text-xs text-primary">
                <input
                  type="checkbox"
                  checked={repeatsWeekly}
                  onChange={(event) => setRepeatsWeekly(event.target.checked)}
                  disabled={isEdit}
                />
                Repeat weekly
              </label>
              {repeatsWeekly && (
                <>
                  <fieldset className="flex gap-1">
                    <legend className="sr-only">Repeat days</legend>
                    {CALENDAR_WEEKDAYS.map((day) => (
                      <button
                        key={day.token}
                        type="button"
                        aria-label={day.token}
                        onClick={() =>
                          setWeekdays((current) =>
                            current.includes(day.token)
                              ? current.filter((value) => value !== day.token)
                              : [...current, day.token]
                          )
                        }
                        className={`h-7 w-7 rounded-full text-xs ${weekdays.includes(day.token) ? 'bg-highlight text-white' : 'bg-input text-secondary'}`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </fieldset>
                  <div className="flex items-center gap-3 text-xs text-secondary">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        checked={recurrenceEnd === 'never'}
                        onChange={() => setRecurrenceEnd('never')}
                      />
                      Never ends
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        checked={recurrenceEnd === 'until'}
                        onChange={() => setRecurrenceEnd('until')}
                      />
                      Ends on
                    </label>
                    {recurrenceEnd === 'until' && (
                      <input
                        aria-label="Repeat until"
                        type="date"
                        value={recurrenceUntil}
                        onChange={(event) => setRecurrenceUntil(event.target.value)}
                        className="h-7 rounded-md border border-default bg-input px-2 text-xs text-primary"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start"
              type="datetime-local"
              value={startStr}
              step={CALENDAR_INCREMENT_MINUTES * 60}
              onChange={(e) => setStartStr(e.target.value)}
            />
            <Input
              label="End"
              type="datetime-local"
              value={endStr}
              step={CALENDAR_INCREMENT_MINUTES * 60}
              onChange={(e) => setEndStr(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="calendar-event-description"
              className="text-xs font-medium text-primary block"
            >
              Description
            </label>
            <textarea
              id="calendar-event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={3}
              className="w-full bg-input border border-default rounded-md text-xs text-primary placeholder:text-muted px-2.5 py-1.5 focus:border-highlight focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <div className="flex items-center justify-between w-full">
          {isEdit ? (
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleDelete()}
                isLoading={deleting}
                disabled={mutating}
                leftIcon={<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDuplicate}
                isLoading={duplicating}
                disabled={mutating}
                leftIcon={<Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
              >
                Duplicate
              </Button>
            </div>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={mutating}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleSave()}
              isLoading={saving}
              disabled={mutating}
            >
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogFooter>
      {pendingAction && event?.recurrence && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-lg border border-default bg-raised p-4 shadow-lg">
            <h3 className="text-sm font-medium text-primary">
              {pendingAction === 'delete' ? 'Delete recurring event' : 'Update recurring event'}
            </h3>
            <p className="mt-2 text-xs text-secondary">Choose what this change should affect.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setPendingAction(null);
                  void (pendingAction === 'delete'
                    ? handleDelete('occurrence')
                    : handleSave('occurrence'));
                }}
              >
                This occurrence only
              </Button>
              <Button
                variant={pendingAction === 'delete' ? 'danger' : 'primary'}
                size="md"
                onClick={() => {
                  setPendingAction(null);
                  void (pendingAction === 'delete' ? handleDelete('series') : handleSave('series'));
                }}
              >
                Entire series
              </Button>
              <Button variant="ghost" size="md" onClick={() => setPendingAction(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

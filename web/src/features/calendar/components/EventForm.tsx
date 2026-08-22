import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { CalendarEvent } from '@/types';

type EventFormProps = {
  isOpen: boolean;
  event: CalendarEvent | null; // null = create, event = edit
  initialStart?: Date; // used in create mode for prefilled start time
  onClose: () => void;
  onSaved: () => void; // called after successful save/delete so parent can refetch
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
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset form whenever the dialog opens or the event/initialStart changes.
  useEffect(() => {
    if (!isOpen) return;
    if (event) {
      setTitle(event.title || '');
      setStartStr(toLocalDateTimeInput(new Date(event.start)));
      setEndStr(toLocalDateTimeInput(new Date(event.end)));
      setDescription(event.description || '');
      setLocation(event.location || '');
    } else {
      const start = initialStart ?? nextHour(new Date());
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setTitle('');
      setStartStr(toLocalDateTimeInput(start));
      setEndStr(toLocalDateTimeInput(end));
      setDescription('');
      setLocation('');
    }
  }, [isOpen, event, initialStart]);

  const handleSave = async () => {
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
      const body = {
        title: title.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
      };
      if (isEdit && event) {
        await api.calendar.updateEvent(event.id, body);
        toast('Event updated', 'success');
      } else {
        await api.calendar.createEvent(body);
        toast('Event created', 'success');
      }
      onSaved();
      onClose();
    } catch {
      toast(isEdit ? 'Failed to update event' : 'Failed to create event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!window.confirm('Delete this event? This cannot be undone.')) return;

    setDeleting(true);
    try {
      await api.calendar.deleteEvent(event.id);
      toast('Event deleted', 'success');
      onSaved();
      onClose();
    } catch {
      toast('Failed to delete event', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="w-full max-w-dialog-md">
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start"
              type="datetime-local"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
            />
            <Input
              label="End"
              type="datetime-local"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
            />
          </div>
          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
          />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary block">Description</label>
            <textarea
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
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={deleting}
              leftIcon={<Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />}
            >
              Delete
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving}>
              {isEdit ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </Dialog>
  );
}

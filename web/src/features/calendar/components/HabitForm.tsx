import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogBody, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { CreateHabitInput, Habit } from '@/types';

const ICONS = ['check', 'book', 'dumbbell', 'droplets', 'heart', 'moon', 'sun'];
const COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#dc2626', '#db2777'];

type HabitFormProps = {
  isOpen: boolean;
  habit: Habit | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function HabitForm({ isOpen, habit, onClose, onSaved }: HabitFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(habit?.name ?? '');
    setDescription(habit?.description ?? '');
    setColor(habit?.color ?? COLORS[0]);
    setIcon(habit?.icon ?? ICONS[0]);
  }, [habit, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    const payload: CreateHabitInput = {
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
    };

    setSaving(true);
    try {
      if (habit) {
        await api.habits.updateHabit(habit.id, payload);
        toast('Habit updated', 'success');
      } else {
        await api.habits.createHabit(payload);
        toast('Habit created', 'success');
      }
      await onSaved();
      onClose();
    } catch {
      toast(habit ? 'Failed to update habit' : 'Failed to create habit', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="w-full max-w-dialog-md">
      <DialogHeader title={habit ? 'Edit habit' : 'New habit'} onClose={onClose} />
      <DialogBody>
        <div className="space-y-3">
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Read for 20 minutes"
            autoFocus
          />
          <div className="space-y-1.5">
            <label htmlFor="habit-description" className="block text-xs font-medium text-primary">
              Description
            </label>
            <textarea
              id="habit-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
              rows={3}
              className="w-full resize-none rounded-md border border-default bg-input px-2.5 py-1.5 text-xs text-primary placeholder:text-muted focus:border-highlight focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Color" value={color} onChange={(event) => setColor(event.target.value)}>
              {COLORS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Select label="Icon" value={icon} onChange={(event) => setIcon(event.target.value)}>
              {ICONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={() => void handleSave()} isLoading={saving}>
          {habit ? 'Save' : 'Create'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

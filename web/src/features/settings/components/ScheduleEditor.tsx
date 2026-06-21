import { useState } from 'react';
import type { PanelScheduleStatus } from '@/types';
import { Button } from '@/components/ui/Button';

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface ScheduleEditorProps {
  schedule: PanelScheduleStatus;
  saving: boolean;
  onSave: (
    mode: 'interval' | 'weekly',
    intervalMinutes?: number,
    weeklyDay?: number,
    weeklyHour?: number
  ) => void;
  onCancel: () => void;
}

export function ScheduleEditor({ schedule, saving, onSave, onCancel }: ScheduleEditorProps) {
  const [mode, setMode] = useState<'interval' | 'weekly'>(schedule.mode);
  const [intervalHours, setIntervalHours] = useState(
    Math.floor((schedule.intervalMinutes || 0) / 60)
  );
  const [weeklyDay, setWeeklyDay] = useState(schedule.weeklyDay || 6);
  const [weeklyHour, setWeeklyHour] = useState(schedule.weeklyHour || 8);

  const handleSave = () => {
    if (mode === 'interval') {
      onSave(mode, intervalHours * 60, undefined, undefined);
    } else {
      onSave(mode, undefined, weeklyDay, weeklyHour);
    }
  };

  return (
    <div className="pt-3 border-t border-default space-y-3">
      <div>
        <label className="text-xs font-medium text-primary block mb-1.5">Schedule Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'interval' | 'weekly')}
          className="w-full h-6 px-2 bg-input border border-default rounded-md text-xs text-primary focus:border-highlight focus:outline-none transition-colors"
        >
          <option value="interval">Interval</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>

      {mode === 'interval' && (
        <div>
          <label className="text-xs font-medium text-primary block mb-1.5">
            Refresh Every (hours)
          </label>
          <input
            type="number"
            min="1"
            max="168"
            value={intervalHours}
            onChange={(e) => setIntervalHours(Number.parseInt(e.target.value))}
            className="w-full h-6 px-2 bg-input border border-default rounded-md text-xs text-primary placeholder:text-muted focus:border-highlight focus:outline-none transition-colors"
          />
        </div>
      )}

      {mode === 'weekly' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-primary block mb-1.5">Day of Week</label>
            <select
              value={weeklyDay}
              onChange={(e) => setWeeklyDay(Number.parseInt(e.target.value))}
              className="w-full h-6 px-2 bg-input border border-default rounded-md text-xs text-primary focus:border-highlight focus:outline-none transition-colors"
            >
              {WEEKDAY_LABELS.map((day, i) => (
                <option key={i} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-primary block mb-1.5">Hour (24h)</label>
            <input
              type="number"
              min="0"
              max="23"
              value={weeklyHour}
              onChange={(e) => setWeeklyHour(Number.parseInt(e.target.value))}
              className="w-full h-6 px-2 bg-input border border-default rounded-md text-xs text-primary placeholder:text-muted focus:border-highlight focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" onClick={handleSave} disabled={saving} isLoading={saving}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

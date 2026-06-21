import { useState } from 'react';
import type { PanelScheduleStatus } from '@/types';
import { Button, Select, Input } from '@/components/ui';

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
      <Select
        label="Schedule Mode"
        value={mode}
        onChange={(e) => setMode(e.target.value as 'interval' | 'weekly')}
      >
        <option value="interval">Interval</option>
        <option value="weekly">Weekly</option>
      </Select>

      {mode === 'interval' && (
        <Input
          type="number"
          label="Refresh Every (hours)"
          min="1"
          max="168"
          value={intervalHours}
          onChange={(e) => setIntervalHours(Number.parseInt(e.target.value))}
        />
      )}

      {mode === 'weekly' && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Day of Week"
            value={weeklyDay}
            onChange={(e) => setWeeklyDay(Number.parseInt(e.target.value))}
          >
            {WEEKDAY_LABELS.map((day, i) => (
              <option key={i} value={i}>
                {day}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            label="Hour (24h)"
            min="0"
            max="23"
            value={weeklyHour}
            onChange={(e) => setWeeklyHour(Number.parseInt(e.target.value))}
          />
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

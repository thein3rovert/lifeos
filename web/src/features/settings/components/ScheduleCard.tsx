import { useState } from 'react';
import type { PanelType, PanelScheduleStatus } from '@/types';
import { Button } from '@/components/ui/Button';
import { Pause, Play, Edit2 } from 'lucide-react';
import { ScheduleEditor } from './ScheduleEditor';

interface ScheduleCardProps {
  panelType: PanelType;
  schedule: PanelScheduleStatus;
  label: string;
  saving: boolean;
  onPause: () => void;
  onResume: () => void;
  onUpdateSchedule: (
    mode: 'interval' | 'weekly',
    intervalMinutes?: number,
    weeklyDay?: number,
    weeklyHour?: number
  ) => void;
}

export function ScheduleCard({
  panelType,
  schedule,
  label,
  saving,
  onPause,
  onResume,
  onUpdateSchedule,
}: ScheduleCardProps) {
  const [editing, setEditing] = useState(false);

  const nextRefresh = schedule.nextRefresh
    ? new Date(schedule.nextRefresh).toLocaleString()
    : 'N/A';

  const handleSave = (
    mode: 'interval' | 'weekly',
    intervalMinutes?: number,
    weeklyDay?: number,
    weeklyHour?: number
  ) => {
    onUpdateSchedule(mode, intervalMinutes, weeklyDay, weeklyHour);
    setEditing(false);
  };

  return (
    <div className="bg-raised border border-default rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-primary">{label}</h3>
            {schedule.paused && (
              <span className="text-xxs bg-warning/10 text-warning px-2 py-0.5 rounded-sm">
                Paused
              </span>
            )}
          </div>
          <p className="text-xs text-secondary">{schedule.interval}</p>
          <p className="text-xxs text-muted mt-1">Next: {nextRefresh}</p>
          {schedule.lastError && (
            <p className="text-xxs text-error mt-1">{schedule.lastError}</p>
          )}
        </div>
        {!editing && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              disabled={saving}
              leftIcon={<Edit2 className="w-3 h-3" />}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant={schedule.paused ? 'primary' : 'secondary'}
              onClick={schedule.paused ? onResume : onPause}
              disabled={saving}
              isLoading={saving}
              leftIcon={
                !saving &&
                (schedule.paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />)
              }
            >
              {schedule.paused ? 'Resume' : 'Pause'}
            </Button>
          </div>
        )}
      </div>

      {editing && (
        <ScheduleEditor
          schedule={schedule}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

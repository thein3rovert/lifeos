import { Button } from '@/components/ui/Button';
import { Pause, Play } from 'lucide-react';

interface GlobalScheduleControlProps {
  globalPaused: boolean;
  saving: boolean;
  onToggle: () => void;
}

export function GlobalScheduleControl({
  globalPaused,
  saving,
  onToggle,
}: GlobalScheduleControlProps) {
  return (
    <div className="bg-raised border border-default rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-primary">Global Auto-Refresh</h2>
          <p className="text-xs text-secondary mt-1">
            Pause or resume all panel auto-refreshes at once
          </p>
        </div>
        <Button
          variant="neuro"
          size="sm"
          onClick={onToggle}
          disabled={saving}
          isLoading={saving}
          leftIcon={
            !saving &&
            (globalPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />)
          }
        >
          {globalPaused ? 'Resume All' : 'Pause All'}
        </Button>
      </div>
    </div>
  );
}

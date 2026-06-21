import { createFileRoute } from '@tanstack/react-router';
import type { PanelType } from '@/types';
import { useScheduleSettings } from '@/features/settings/hooks/useScheduleSettings';
import { GlobalScheduleControl } from '@/features/settings/components/GlobalScheduleControl';
import { ScheduleCard } from '@/features/settings/components/ScheduleCard';

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
});

const PANEL_LABELS: Record<PanelType, string> = {
  'things-to-remember': 'Things to Remember',
  'suggestions': 'Suggestions',
  'achievements': 'Achievements',
  'blockers': 'Blockers',
};

function SettingsPage() {
  const {
    schedules,
    loading,
    saving,
    globalPaused,
    pausePanel,
    resumePanel,
    toggleGlobal,
    updateSchedule,
  } = useScheduleSettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted text-xs">Loading...</div>
      </div>
    );
  }

  if (!schedules) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted text-xs">Failed to load schedules</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-lg font-medium text-primary">Settings</h1>
          <p className="text-xs text-secondary">Manage Smart Board auto-refresh schedules</p>
        </div>

        {/* Global Control */}
        <GlobalScheduleControl
          globalPaused={globalPaused}
          saving={saving === 'global'}
          onToggle={toggleGlobal}
        />

        {/* Panel Schedules */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-primary">Panel Schedules</h2>
          {(Object.keys(schedules) as PanelType[]).map((panelType) => (
            <ScheduleCard
              key={panelType}
              panelType={panelType}
              schedule={schedules[panelType]}
              label={PANEL_LABELS[panelType]}
              saving={saving === panelType}
              onPause={() => pausePanel(panelType, PANEL_LABELS[panelType])}
              onResume={() => resumePanel(panelType, PANEL_LABELS[panelType])}
              onUpdateSchedule={updateSchedule.bind(null, panelType)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

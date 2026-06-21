import { useState, useEffect } from 'react';
import { smartboardApi } from '@/lib/api/smartboard';
import type { PanelType, ScheduleStatusMap } from '@/types';
import { toast } from '@/components/ui/Toast';

export function useScheduleSettings() {
  const [schedules, setSchedules] = useState<ScheduleStatusMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [globalPaused, setGlobalPaused] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const data = await smartboardApi.getSchedule();
      setSchedules(data);
      const allPaused = Object.values(data).every((s) => s.paused);
      setGlobalPaused(allPaused);
    } catch (error) {
      toast('Failed to load schedules', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pausePanel = async (panelType: PanelType, label: string) => {
    try {
      setSaving(panelType);
      await smartboardApi.pausePanel(panelType);
      await loadSchedules();
      toast(label + ' paused', 'success');
    } catch (error) {
      toast('Failed to pause panel', 'error');
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  const resumePanel = async (panelType: PanelType, label: string) => {
    try {
      setSaving(panelType);
      await smartboardApi.resumePanel(panelType);
      await loadSchedules();
      toast(label + ' resumed', 'success');
    } catch (error) {
      toast('Failed to resume panel', 'error');
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  const toggleGlobal = async () => {
    try {
      setSaving('global');
      if (globalPaused) {
        await smartboardApi.resumeAllPanels();
        toast('All panels resumed', 'success');
      } else {
        await smartboardApi.pauseAllPanels();
        toast('All panels paused', 'success');
      }
      await loadSchedules();
    } catch (error) {
      toast('Failed to update panels', 'error');
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  const updateSchedule = async (
    panelType: PanelType,
    mode: 'interval' | 'weekly',
    intervalMinutes?: number,
    weeklyDay?: number,
    weeklyHour?: number
  ) => {
    try {
      setSaving(panelType);
      await smartboardApi.setPanelSchedule(panelType, {
        mode,
        intervalMinutes,
        weeklyDay,
        weeklyHour,
      });
      await loadSchedules();
      toast('Schedule updated', 'success');
    } catch (error) {
      toast('Failed to update schedule', 'error');
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  return {
    schedules,
    loading,
    saving,
    globalPaused,
    pausePanel,
    resumePanel,
    toggleGlobal,
    updateSchedule,
  };
}

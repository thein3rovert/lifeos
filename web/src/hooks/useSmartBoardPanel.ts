import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { PanelType, ScheduleStatusMap } from '@/types';

type UseSmartBoardPanelReturn<T> = {
  data: T | null;
  loading: boolean;
  lastRefreshed: Date | null;
  error: Error | null;
  refresh: () => Promise<void>;
  updateItemStatus: (itemId: string, status: string) => Promise<void>;
};

export function useSmartBoardPanel<T>(panelType: PanelType): UseSmartBoardPanelReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Fetch cached data on mount
  const fetchCachedData = useCallback(async () => {
    try {
      const result = await api.smartboard.getPanel(panelType);
      setData(result.data as T);
      setLastRefreshed(result.lastRefreshed ? new Date(result.lastRefreshed) : null);
      setError(null);
    } catch (err) {
      const normalized = toError(err);
      console.error(`Failed to fetch ${panelType}:`, normalized);
      setError(normalized);
    }
  }, [panelType]);

  // Refresh panel with fresh AI data
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.smartboard.refreshPanel(panelType);
      setData(result.data as T);
      setLastRefreshed(new Date());
      setError(null);
      toast('Panel updated successfully', 'success');
    } catch (err) {
      const normalized = toError(err);
      console.error(`Failed to refresh ${panelType}:`, normalized);
      setError(normalized);
      toast('Failed to refresh panel', 'error');
    } finally {
      setLoading(false);
    }
  }, [panelType]);

  // Update item status
  const updateItemStatus = useCallback(
    async (itemId: string, status: string) => {
      try {
        await api.smartboard.updateItemStatus(itemId, panelType, status);
        // Refresh cached data after update
        await fetchCachedData();
        toast('Item updated', 'success');
      } catch (err) {
        const normalized = toError(err);
        console.error('Failed to update item status:', normalized);
        toast(normalized.message, 'error');
      }
    },
    [panelType, fetchCachedData]
  );

  // Fetch cached data on mount
  useEffect(() => {
    fetchCachedData();
  }, [fetchCachedData]);

  return {
    data,
    loading,
    lastRefreshed,
    error,
    refresh,
    updateItemStatus,
  };
}

/**
 * Fetches scheduler status (next refresh time, last error) for all panels.
 * Polls every 60 seconds to keep "next refresh" countdown accurate.
 */
export function useScheduleStatus() {
  const [schedule, setSchedule] = useState<ScheduleStatusMap | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      const data = await api.smartboard.getSchedule();
      setSchedule(data);
    } catch {
      // Silently ignore — schedule is non-critical UI
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, 60_000); // poll every 60s
    return () => clearInterval(interval);
  }, [fetchSchedule]);

  return schedule;
}

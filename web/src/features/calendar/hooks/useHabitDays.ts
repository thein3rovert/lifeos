import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { HabitDay } from '@/types';

export function useHabitDays(start: string, end: string, enabled = true) {
  const [days, setDays] = useState<HabitDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setDays([]);
      return;
    }
    setLoading(true);
    try {
      const response = await api.habits.getHabitDays(start, end);
      setDays(response.days);
      setError(null);
    } catch (err) {
      setError(toError(err));
    } finally {
      setLoading(false);
    }
  }, [enabled, end, start]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createToday = useCallback(async (date: string) => {
    const response = await api.habits.createHabitDay(date);
    setDays((current) =>
      current.some((day) => day.id === response.day.id)
        ? current
        : [...current, response.day].sort((a, b) => b.date.localeCompare(a.date))
    );
    return response;
  }, []);

  return { days, loading, error, refresh, createToday };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { Habit } from '@/types';

export function useHabits(enabled = true) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const fetchHabits = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!enabled) {
      setHabits([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.habits.getHabits();
      if (requestId !== requestIdRef.current) return;
      setHabits(response.habits);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(toError(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetchHabits();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchHabits]);

  return { habits, loading, error, refresh: fetchHabits };
}

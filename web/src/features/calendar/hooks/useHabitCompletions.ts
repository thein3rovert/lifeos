import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import { habitCompletionKey } from '../utils';

export function useHabitCompletions(start: string, end: string, enabled = true) {
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const toggleIdsRef = useRef(new Map<string, number>());
  const completedKeysRef = useRef(completedKeys);

  const replaceCompletedKeys = useCallback((next: Set<string>) => {
    completedKeysRef.current = next;
    setCompletedKeys(next);
  }, []);

  const fetchCompletions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!enabled) {
      replaceCompletedKeys(new Set());
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.habits.getCompletions(start, end);
      if (requestId !== requestIdRef.current) return;
      replaceCompletedKeys(
        new Set(response.completions.map(({ habitId, date }) => habitCompletionKey(habitId, date)))
      );
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(toError(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [enabled, end, replaceCompletedKeys, start]);

  useEffect(() => {
    void fetchCompletions();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchCompletions]);

  const toggleCompletion = useCallback(
    async (habitId: string, date: string) => {
      const key = habitCompletionKey(habitId, date);
      const toggleId = (toggleIdsRef.current.get(key) ?? 0) + 1;
      toggleIdsRef.current.set(key, toggleId);
      const wasCompleted = completedKeysRef.current.has(key);
      const optimistic = new Set(completedKeysRef.current);
      if (wasCompleted) optimistic.delete(key);
      else optimistic.add(key);
      replaceCompletedKeys(optimistic);
      setError(null);

      try {
        const response = await api.habits.toggleCompletion({ habitId, date });
        if (toggleIdsRef.current.get(key) !== toggleId) return;
        const next = new Set(completedKeysRef.current);
        if (response.completed) next.add(key);
        else next.delete(key);
        replaceCompletedKeys(next);
      } catch (err) {
        if (toggleIdsRef.current.get(key) !== toggleId) return;
        const next = new Set(completedKeysRef.current);
        if (wasCompleted) next.add(key);
        else next.delete(key);
        replaceCompletedKeys(next);
        setError(toError(err));
      }
    },
    [replaceCompletedKeys]
  );

  return { completedKeys, loading, error, refresh: fetchCompletions, toggleCompletion };
}

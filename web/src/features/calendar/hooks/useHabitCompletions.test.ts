import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { useHabitCompletions } from './useHabitCompletions';

vi.mock('@/lib/api', () => ({
  api: {
    habits: {
      getCompletions: vi.fn(),
      toggleCompletion: vi.fn(),
    },
  },
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('useHabitCompletions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.habits.getCompletions).mockResolvedValue({ completions: [] });
  });

  it('keeps the newest visible-month response', async () => {
    const oldRange = deferred<{ completions: [] }>();
    const newRange = deferred<{ completions: [] }>();
    vi.mocked(api.habits.getCompletions)
      .mockReturnValueOnce(oldRange.promise)
      .mockReturnValueOnce(newRange.promise);
    const { result, rerender } = renderHook(({ start, end }) => useHabitCompletions(start, end), {
      initialProps: { start: '2026-08-30', end: '2026-10-10' },
    });

    rerender({ start: '2026-09-27', end: '2026-11-07' });
    await act(async () => newRange.resolve({ completions: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => oldRange.resolve({ completions: [] }));
    expect(api.habits.getCompletions).toHaveBeenLastCalledWith('2026-09-27', '2026-11-07');
  });

  it('optimistically toggles and rolls back when persistence fails', async () => {
    const request = deferred<{ habitId: string; date: string; completed: boolean }>();
    vi.mocked(api.habits.toggleCompletion).mockReturnValue(request.promise);
    const { result } = renderHook(() => useHabitCompletions('2026-09-01', '2026-09-30'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let togglePromise: Promise<void>;
    act(() => {
      togglePromise = result.current.toggleCompletion('habit-1', '2026-09-07');
    });
    expect(result.current.completedKeys.has('habit-1:2026-09-07')).toBe(true);

    await act(async () => {
      request.resolve(Promise.reject(new Error('offline')) as never);
      await togglePromise;
    });
    expect(result.current.completedKeys.has('habit-1:2026-09-07')).toBe(false);
    expect(result.current.error?.message).toBe('offline');
  });
});

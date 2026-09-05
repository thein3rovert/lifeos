import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    habits: {
      getHabitDays: vi.fn(),
      createHabitDay: vi.fn(),
    },
  },
}));

import { useHabitDays } from './useHabitDays';

describe('useHabitDays', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reuses an idempotently returned day without duplicating it', async () => {
    const today = { id: 'day-1', date: '2026-09-05', createdAt: '' };
    vi.mocked(api.habits.getHabitDays).mockResolvedValue({ days: [today] });
    vi.mocked(api.habits.createHabitDay).mockResolvedValue({ day: today, created: false });
    const { result } = renderHook(() => useHabitDays('2026-09-01', '2026-09-30'));
    await waitFor(() => expect(result.current.days).toHaveLength(1));

    await act(() => result.current.createToday('2026-09-05'));

    expect(api.habits.createHabitDay).toHaveBeenCalledWith('2026-09-05');
    expect(result.current.days).toEqual([today]);
  });
});

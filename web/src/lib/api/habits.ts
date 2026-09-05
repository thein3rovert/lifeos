import type {
  CreateHabitInput,
  Habit,
  HabitCompletion,
  HabitDay,
  ToggleHabitCompletionInput,
  UpdateHabitInput,
} from '@/types';
import { fetcher } from './client';

export const habitsApi = {
  getHabits: () => fetcher<{ habits: Habit[] }>('/api/habits'),

  createHabit: (body: CreateHabitInput) =>
    fetcher<Habit>('/api/habits', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateHabit: (id: string, body: UpdateHabitInput) =>
    fetcher<Habit>(`/api/habits/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteHabit: (id: string) =>
    fetcher<void>(`/api/habits/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  getHabitDays: (start: string, end: string) =>
    fetcher<{ days: HabitDay[] }>(
      `/api/habit-days?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    ),

  createHabitDay: (date: string) =>
    fetcher<{ day: HabitDay; created: boolean }>('/api/habit-days', {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),

  getCompletions: (start: string, end: string) =>
    fetcher<{ completions: HabitCompletion[] }>(
      `/api/habits/completions?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    ),

  toggleCompletion: (body: ToggleHabitCompletionInput) =>
    fetcher<{ habitId: string; date: string; completed: boolean }>('/api/habits/completions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

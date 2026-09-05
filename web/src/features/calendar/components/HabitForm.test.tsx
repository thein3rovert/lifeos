import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { Habit } from '@/types';
import { HabitForm } from './HabitForm';
import { HabitManagementPanel } from './HabitManagementPanel';

vi.mock('@/lib/api', () => ({
  api: {
    habits: {
      createHabit: vi.fn(),
      updateHabit: vi.fn(),
      deleteHabit: vi.fn(),
    },
  },
}));

vi.mock('@/components/ui/Toast', () => ({ toast: vi.fn() }));

const habit: Habit = {
  id: 'habit-1',
  name: 'Read',
  description: 'Read a chapter',
  color: '#2563eb',
  icon: 'book',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

describe('Habit management', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('creates a reusable habit with the expected payload', async () => {
    vi.mocked(api.habits.createHabit).mockResolvedValue(habit);
    const onSaved = vi.fn();
    render(<HabitForm isOpen habit={null} onClose={vi.fn()} onSaved={onSaved} />);

    fireEvent.change(screen.getByPlaceholderText('Read for 20 minutes'), {
      target: { value: '  Morning walk  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Optional'), {
      target: { value: '  Before work  ' },
    });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '#059669' } });
    fireEvent.change(selects[1], { target: { value: 'sun' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(api.habits.createHabit).toHaveBeenCalledWith({
        name: 'Morning walk',
        description: 'Before work',
        color: '#059669',
        icon: 'sun',
      })
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it('updates an existing habit with the edited payload', async () => {
    vi.mocked(api.habits.updateHabit).mockResolvedValue({ ...habit, name: 'Read daily' });
    render(<HabitForm isOpen habit={habit} onClose={vi.fn()} onSaved={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Read for 20 minutes'), {
      target: { value: 'Read daily' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.habits.updateHabit).toHaveBeenCalledWith('habit-1', {
        name: 'Read daily',
        description: 'Read a chapter',
        color: '#2563eb',
        icon: 'book',
      })
    );
  });

  it('opens edit and performs a confirmed soft-delete', async () => {
    vi.mocked(api.habits.deleteHabit).mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onEdit = vi.fn();
    const onRefresh = vi.fn();
    render(
      <HabitManagementPanel
        habits={[habit]}
        loading={false}
        error={null}
        onAdd={vi.fn()}
        onEdit={onEdit}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Read' }));
    expect(onEdit).toHaveBeenCalledWith(habit);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Read' }));
    expect(window.confirm).toHaveBeenCalledWith(
      'Delete "Read"? Past completion history will be preserved.'
    );
    await waitFor(() => expect(api.habits.deleteHabit).toHaveBeenCalledWith('habit-1'));
    expect(onRefresh).toHaveBeenCalledOnce();
  });
});

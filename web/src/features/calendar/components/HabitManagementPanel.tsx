import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { Habit } from '@/types';

type HabitManagementPanelProps = {
  habits: Habit[];
  loading: boolean;
  error: Error | null;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
  onRefresh: () => void | Promise<void>;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

export function HabitManagementPanel({
  habits,
  loading,
  error,
  onAdd,
  onEdit,
  onRefresh,
  collapsed = false,
  onToggleCollapsed = () => {},
}: HabitManagementPanelProps) {
  const handleDelete = async (habit: Habit) => {
    if (!window.confirm(`Delete "${habit.name}"? Past completion history will be preserved.`))
      return;
    try {
      await api.habits.deleteHabit(habit.id);
      toast('Habit deleted', 'success');
      await onRefresh();
    } catch {
      toast('Failed to delete habit', 'error');
    }
  };

  return (
    <section
      className="mb-4 rounded-lg border border-default bg-raised"
      aria-labelledby="habit-management-title"
    >
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex items-center gap-2 text-left"
        >
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-tertiary" />
          ) : (
            <ChevronUp className="h-4 w-4 text-tertiary" />
          )}
          <div>
            <h2 id="habit-management-title" className="text-sm font-medium text-primary">
              Your habits
            </h2>
            <p className="mt-0.5 text-xs text-tertiary">
              Manage the reusable habits shown on each tracking day.
            </p>
          </div>
        </button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onAdd}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          Add habit
        </Button>
      </div>
      {collapsed ? null : loading ? (
        <p className="px-4 py-4 text-xs text-tertiary">Loading habits...</p>
      ) : error ? (
        <div className="flex items-center justify-between px-4 py-4 text-xs">
          <span className="text-error">Failed to load habits.</span>
          <Button variant="ghost" size="sm" onClick={() => void onRefresh()}>
            Retry
          </Button>
        </div>
      ) : habits.length === 0 ? (
        <p className="px-4 py-4 text-xs text-tertiary">
          No habits yet. Add one to start building your tracking list.
        </p>
      ) : (
        <ul className="divide-y divide-subtle">
          {habits.map((habit) => (
            <li key={habit.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: habit.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-primary">{habit.name}</p>
                <p className="mt-0.5 truncate text-xs text-tertiary">
                  {habit.description || habit.icon}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(habit)}
                aria-label={`Edit ${habit.name}`}
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete(habit)}
                aria-label={`Delete ${habit.name}`}
                leftIcon={<Trash2 className="h-3.5 w-3.5 text-error" />}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

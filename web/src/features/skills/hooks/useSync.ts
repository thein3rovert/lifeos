import { useCallback, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { Skill } from '@/types';

type SyncState = 'idle' | 'pulling' | 'pushing';

interface UseSyncReturn {
  syncState: SyncState;
  error: Error | null;
  pendingCount: number;
  sync: () => Promise<void>;
  push: () => Promise<boolean>;
  pushSelected: (skillIds: string[]) => Promise<boolean>;
  checkHasLocalChanges: (skills: Skill[]) => boolean;
}

export function useSync(): UseSyncReturn {
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [error, setError] = useState<Error | null>(null);

  const sync = useCallback(async () => {
    setSyncState('pulling');
    setError(null);
    try {
      await api.skills.sync();
    } catch (err) {
      const normalized = toError(err);
      setError(normalized);
      toast(normalized.message, 'error');
    } finally {
      setSyncState('idle');
    }
  }, []);

  const push = useCallback(async (): Promise<boolean> => {
    setSyncState('pushing');
    setError(null);
    try {
      await api.skills.push();
      return true;
    } catch (err) {
      const normalized = toError(err);
      setError(normalized);
      toast(normalized.message, 'error');
      return false;
    } finally {
      setSyncState('idle');
    }
  }, []);

  const pushSelected = useCallback(async (skillIds: string[]): Promise<boolean> => {
    setSyncState('pushing');
    setError(null);
    try {
      for (const skillId of skillIds) {
        await api.skills.pushSingle(skillId);
      }
      return true;
    } catch (err) {
      const normalized = toError(err);
      setError(normalized);
      toast(normalized.message, 'error');
      return false;
    } finally {
      setSyncState('idle');
    }
  }, []);

  const checkHasLocalChanges = useCallback((skills: Skill[]): boolean => {
    const pendingCount = skills.filter((s) => s.pending_sync).length;
    const skillsWithNotes = skills.filter((s) => (s.note_count || 0) > 0).length;
    return pendingCount > 0 || skillsWithNotes > 0;
  }, []);

  return {
    syncState,
    error,
    pendingCount: 0,
    sync,
    push,
    pushSelected,
    checkHasLocalChanges,
  };
}

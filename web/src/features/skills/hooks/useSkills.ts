import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type { SkillDetail, SkillSummary } from '@/types';

interface UseSkillsOptions {
  initialSkills?: SkillSummary[];
  initialSelectedId?: string | null;
  initialDetail?: SkillDetail | null;
}

interface UseSkillsReturn {
  skills: SkillSummary[];
  selectedSkill: SkillSummary | null;
  skillDetail: SkillDetail | null;
  loading: boolean;
  detailLoading: boolean;
  error: Error | null;
  selectSkill: (id: string) => void;
  refreshSkills: () => Promise<void>;
  refreshDetail: () => Promise<void>;
}

export function useSkills(options: UseSkillsOptions = {}): UseSkillsReturn {
  const { initialSkills = [], initialSelectedId = null, initialDetail = null } = options;

  const [skills, setSkills] = useState<SkillSummary[]>(initialSkills);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(initialSelectedId);
  const [skillDetail, setSkillDetail] = useState<SkillDetail | null>(initialDetail);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) || null;

  // Sync with loader data when the URL-selected skill changes.
  useEffect(() => {
    setSelectedSkillId(initialSelectedId);
    setSkillDetail(initialDetail);
  }, [initialSelectedId, initialDetail]);

  const refreshSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.skills.list();
      setSkills(data);
      if (data.length > 0 && !selectedSkillId) {
        setSelectedSkillId(data[0].id);
      }
    } catch (err) {
      const normalized = toError(err);
      setError(normalized);
      toast(normalized.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedSkillId]);

  const refreshDetail = useCallback(async () => {
    if (!selectedSkillId) return;
    setDetailLoading(true);
    try {
      const data = await api.skills.get(selectedSkillId);
      setSkillDetail(data);
    } catch (err) {
      const normalized = toError(err);
      setError(normalized);
      toast(normalized.message, 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [selectedSkillId]);

  const selectSkill = useCallback((id: string) => {
    setSelectedSkillId(id);
    setSkillDetail(null);
  }, []);

  return {
    skills,
    selectedSkill,
    skillDetail,
    loading,
    detailLoading,
    error,
    selectSkill,
    refreshSkills,
    refreshDetail,
  };
}

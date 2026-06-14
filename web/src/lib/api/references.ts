import type { SkillReference } from '@/types';
import { fetcher } from './client';

export const referencesApi = {
  list: (skillId: string) => fetcher<SkillReference[]>(`/api/skills/${skillId}/files`),
  get: (skillId: string, path: string) =>
    fetcher<SkillReference>(`/api/skills/${skillId}/files/${path}`),
  save: (skillId: string, path: string, content: string) =>
    fetcher<{ status: string }>(`/api/skills/${skillId}/files/${path}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
};

import type { AIPreviewResponse, Skill, SkillDetail } from '@/types';
import { fetcher } from './client';

export const skillsApi = {
  list: () => fetcher<Skill[]>('/api/skills'),
  get: (id: string) => fetcher<SkillDetail>(`/api/skills/${id}`),
  sync: () => fetcher<Skill[]>('/api/skills/sync'),
  push: () => fetcher<{ message: string; pushed: number }>('/api/skills/push', { method: 'POST' }),

  save: (id: string, content: string) =>
    fetcher<Skill>('/api/skills/edit', {
      method: 'POST',
      body: JSON.stringify({ skill_id: id, content }),
    }),

  previewAIUpdate: (id: string) =>
    fetcher<AIPreviewResponse>(`/api/skills/${id}/preview`, { method: 'POST' }),

  saveAIUpdate: (id: string, updatedContent: string) =>
    fetcher<{ status: string; skill_id: string }>(`/api/skills/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ updated_content: updatedContent }),
    }),

  create: (title: string, format: string, content: string) =>
    fetcher<Skill>('/api/skills/create', {
      method: 'POST',
      body: JSON.stringify({ title, format, content }),
    }),

  pushSingle: (id: string) =>
    fetcher<{ message: string; pushed: number }>(`/api/skills/${id}/push`, { method: 'POST' }),
};

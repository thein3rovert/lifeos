import type { Note } from '@/types';
import { fetcher } from './client';

export const notesApi = {
  listAll: () => fetcher<Note[]>('/api/notes'),
  list: (skillId: string) => fetcher<Note[]>(`/api/skills/${skillId}/notes`),
  add: (skillId: string, title: string, content: string, type?: 'manual' | 'ai-generated') =>
    fetcher<Note[]>(`/api/skills/${skillId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ title, content, type: type || 'manual' }),
    }),
  delete: (skillId: string, noteId: number) =>
    fetcher(`/api/skills/${skillId}/notes/${noteId}`, { method: 'DELETE' }),
  update: (skillId: string, noteId: number, content: string) =>
    fetcher<Note>(`/api/skills/${skillId}/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  edit: (skillId: string, noteId: number, title: string, content: string) =>
    fetcher<{ status: string }>(`/api/skills/${skillId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, content }),
    }),
};

// =============================================================================
// LifeOS - API Client
// Centralized API client for Go backend
// =============================================================================

import type {
  Skill,
  Note,
  SkillDetail,
  SkillReference,
  ChatMessage,
  ChatSession,
  AIPreviewResponse,
} from '@/types'

// API Base URL - should match Go server
const API_BASE_URL = import.meta.env.VITE_API_URL as string

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

export const api = {
  skills: {
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
  },

  notes: {
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
  },

  chat: {
    getOrCreateSession: (skillId: string) =>
      fetcher<ChatSession>(`/api/skills/${skillId}/session`, { method: 'POST' }),
    sendMessage: (skillId: string, message: string, noteIds?: number[]) =>
      fetcher<{ response: string }>(`/api/skills/${skillId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message, noteIds }),
      }),
    getMessages: (skillId: string) =>
      fetcher<{ messages: ChatMessage[] }>(`/api/skills/${skillId}/messages`),
  },

  references: {
    list: (skillId: string) => fetcher<SkillReference[]>(`/api/skills/${skillId}/files`),
    get: (skillId: string, path: string) => fetcher<SkillReference>(`/api/skills/${skillId}/files/${path}`),
  },
}

// Re-export types for convenience
export type {
  Skill,
  Note,
  SkillDetail,
  SkillReference,
  ChatMessage,
  ChatSession,
  AIPreviewResponse,
} from '@/types'
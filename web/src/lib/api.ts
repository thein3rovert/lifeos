// API Base URL - should match Go server
const API_BASE_URL = 'http://100.105.217.77:6060'

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

export interface Skill {
  id: string
  title: string
  format: string
  content: string
  updated_at: string
  synced_at?: string
  pending_sync?: boolean
}

export interface Note {
  id: number
  skill_id: string
  content: string
  created_at: string
}

export interface SkillDetail {
  skill: Skill
  notes: Note[]
}

// We need the title and id of skill to allow preview
export interface AIPreviewResponse {
  skill_id: string
  title: string
  original_content: string
  updated_content: string
  rendered_html: string
}

export const api = {
  skills: {
    list: () => fetcher<Skill[]>('/api/skills'),
    get: (id: string) => fetcher<SkillDetail>(`/api/skills/${id}`),
    sync: () => fetcher<Skill[]>('/api/skills/sync'),
    push: () => fetcher<{ message: string; pushed: number }>('/api/skills/push', { method: 'POST' }),

    // Save edited markdown to local
    save: (id: string, content: string) =>
      fetcher<Skill>('/api/skills/edit', {
        method: 'POST',
        body: JSON.stringify({ skill_id: id, content }),
      }),

    // Preview ai updated content after its been passed in
    // and processed by opencode
    previewAIUpdate: (id: string) =>
      fetcher<AIPreviewResponse>(`/api/skills/${id}/preview`, { method: 'POST' }),

    // After the review is done same updated content
    saveAIUpdate: (id: string, updatedContent: string) =>
      fetcher<{ status: string; skill_id: string }>(`/api/skills/${id}/save`, {
        method: 'POST',
        body: JSON.stringify({ updated_content: updatedContent }),
      }),

    // Create new skill
    create: (title: string, format: string, content: string) =>
      fetcher<Skill>('/api/skills/create', {
        method: 'POST',
        body: JSON.stringify({ title, format, content }),
      }),

    // Push single skill to GitHub
    pushSingle: (id: string) =>
      fetcher<{ message: string; pushed: number }>(`/api/skills/${id}/push`, { method: 'POST' }),
  },

  notes: {
    listAll: () => fetcher<Note[]>('/api/notes'),
    list: (skillId: string) => fetcher<Note[]>(`/api/skills/${skillId}/notes`),
    add: (skillId: string, content: string) =>
      fetcher<Note[]>(`/api/skills/${skillId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    delete: (skillId: string, noteId: number) =>
      fetcher(`/api/skills/${skillId}/notes/${noteId}`, { method: 'DELETE' }),
  },
}

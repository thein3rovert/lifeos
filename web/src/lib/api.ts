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

export const api = {
  skills: {
    list: () => fetcher<Skill[]>('/api/skills'),
    get: (id: string) => fetcher<SkillDetail>(`/api/skills/${id}`),
    sync: () => fetcher<Skill[]>('/api/skills/sync'),
  },
  
  notes: {
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
// API Base URL - configure via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6060";

// Generic fetch wrapper with error handling
async function fetcher<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Type definitions matching Go API responses
export interface Photo {
  ID: number;
  Filename: string;
  Path: string;
  Caption: string;
  Description: string;
  Tags: Tag[];
  CreatedAt: string;
}

export interface Tag {
  ID: number;
  Name: string;
}

export interface Skill {
  id: string;
  title: string;
  format: string;
  content: string;
  updated_at: string;
}

export interface SkillDetail {
  skill: Skill;
  notes: Note[];
}

export interface Note {
  id: number;
  skill_id: string;
  content: string;
  created_at: string;
}

// API client
export const api = {
  // Photos
  photos: {
    list: () => fetcher<Photo[]>("/api/photos"),
    get: (id: number) => fetcher<Photo>(`/api/photos/${id}`),
    search: (query: string) =>
      fetcher<{ photos: Photo[]; search_query: string }>(
        `/api/photos/search?q=${encodeURIComponent(query)}`
      ),
    upload: async (formData: FormData) => {
      const response = await fetch(`${API_BASE_URL}/api/photos/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      return response.json();
    },
  },

  // Skills
  skills: {
    list: () => fetcher<Skill[]>("/api/skills"),
    get: (id: string) => fetcher<SkillDetail>(`/api/skills/${id}`),
    edit: (skillId: string, content: string) =>
      fetcher<Skill>("/api/skills/edit", {
        method: "POST",
        body: JSON.stringify({ skill_id: skillId, content }),
      }),
    sync: () => fetcher<Skill[]>("/api/skills/sync"),
  },

  // Notes
  notes: {
    list: (skillId: string) => fetcher<Note[]>(`/api/skills/${skillId}/notes`),
    add: (skillId: string, content: string) =>
      fetcher<Note[]>(`/api/skills/${skillId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    delete: (skillId: string, noteId: number) =>
      fetcher(`/api/skills/${skillId}/notes/${noteId}`, { method: "DELETE" }),
  },

  // Tags
  tags: {
    list: () => fetcher<Tag[]>("/api/tags"),
  },

  // AI Workflow
  ai: {
    preview: (skillId: string) =>
      fetcher<{
        skill_id: string;
        title: string;
        original_content: string;
        updated_content: string;
        rendered_html: string;
      }>(`/api/skills/${skillId}/preview`, { method: "POST" }),
    save: (skillId: string, updatedContent: string) =>
      fetcher(`/api/skills/${skillId}/save`, {
        method: "POST",
        body: JSON.stringify({ updated_content: updatedContent }),
      }),
    renderMarkdown: (content: string) =>
      fetcher<{ html: string }>("/api/skills/preview-render", {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
  },
};
import type { ChatMessage, ChatSession } from '@/types';
import { fetcher } from './client';

export const chatApi = {
  getOrCreateSession: (skillId: string) =>
    fetcher<ChatSession>(`/api/skills/${skillId}/session`, { method: 'POST' }),
  sendMessage: (skillId: string, message: string, noteIds?: number[]) =>
    fetcher<{ response: string }>(`/api/skills/${skillId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message, noteIds }),
    }),
  getMessages: (skillId: string) =>
    fetcher<{ messages: ChatMessage[] }>(`/api/skills/${skillId}/messages`),
};

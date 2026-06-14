import { fetcher } from './client';

export const agentApi = {
  chat: (message: string, sessionId?: string | null) =>
    fetcher<{ response: string; sessionId: string }>('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),
};

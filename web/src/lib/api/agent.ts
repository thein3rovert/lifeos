import type { AgentConversation, AgentConversationMessage } from '@/types';
import { fetcher } from './client';

export const agentApi = {
  createConversation: () =>
    fetcher<{ conversation: AgentConversation }>('/api/agent/conversations', {
      method: 'POST',
    }),
  listConversations: () =>
    fetcher<{ conversations: AgentConversation[] }>('/api/agent/conversations'),
  getConversation: (id: string) =>
    fetcher<{ conversation: AgentConversation; messages: AgentConversationMessage[] }>(
      `/api/agent/conversations/${encodeURIComponent(id)}`
    ),
  sendMessage: (id: string, message: string) =>
    fetcher<{ message: AgentConversationMessage; conversation: AgentConversation }>(
      `/api/agent/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    ),
};

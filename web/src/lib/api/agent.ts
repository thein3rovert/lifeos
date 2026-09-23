import { apiUrl } from '@/lib/apiUrl';
import type {
  AgentConversation,
  AgentConversationMessage,
  AgentFormValue,
  AgentInteractions,
  AgentMessageContext,
} from '@/types';
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
  activityUrl: (id: string) =>
    apiUrl(`/api/agent/conversations/${encodeURIComponent(id)}/activity`),
  getInteractions: (id: string) =>
    fetcher<AgentInteractions>(`/api/agent/conversations/${encodeURIComponent(id)}/interactions`),
  replyPermission: (id: string, requestId: string, decision: 'once' | 'always' | 'reject') =>
    fetcher<{ status: string; decision: string }>(
      `/api/agent/conversations/${encodeURIComponent(id)}/permissions/${encodeURIComponent(requestId)}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({ decision }),
      }
    ),
  replyForm: (id: string, formId: string, answer: Record<string, AgentFormValue>) =>
    fetcher<{ status: string }>(
      `/api/agent/conversations/${encodeURIComponent(id)}/forms/${encodeURIComponent(formId)}/reply`,
      {
        method: 'POST',
        body: JSON.stringify({ answer }),
      }
    ),
  cancelForm: (id: string, formId: string) =>
    fetcher<{ status: string }>(
      `/api/agent/conversations/${encodeURIComponent(id)}/forms/${encodeURIComponent(formId)}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    ),
  sendMessage: (
    id: string,
    message: string,
    requestId?: string,
    contexts: AgentMessageContext[] = [],
    delivery: 'steer' | 'queue' = 'queue',
    messageId?: string,
    retryMessageId?: string
  ) =>
    fetcher<{
      message: AgentConversationMessage;
      userMessage: AgentConversationMessage;
      conversation: AgentConversation;
    }>(`/api/agent/conversations/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, requestId, contexts, delivery, messageId, retryMessageId }),
    }),
  abort: (requestId: string) =>
    fetcher<{ aborted: boolean; requestId: string }>('/api/agent/abort', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    }),
};

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import type { AgentConversation, AgentConversationMessage } from '@/types';
import { FloatingChat } from '@/components/agent/FloatingChat';

vi.mock('@/lib/api', () => ({
  api: {
    agent: {
      createConversation: vi.fn(),
      listConversations: vi.fn(),
      getConversation: vi.fn(),
      sendMessage: vi.fn(),
    },
  },
}));

const conversation: AgentConversation = {
  id: 'conversation-1',
  title: 'Plan the week',
  createdAt: '2026-09-22T10:00:00Z',
  updatedAt: '2026-09-23T10:00:00Z',
};

const transcript: AgentConversationMessage[] = [
  {
    id: 'message-1',
    role: 'user',
    content: 'What should I focus on?',
    createdAt: '2026-09-23T10:00:00Z',
  },
  {
    id: 'message-2',
    role: 'assistant',
    content: 'Start with the release checklist.',
    createdAt: '2026-09-23T10:00:01Z',
  },
];

describe('FloatingChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.agent.listConversations).mockResolvedValue({ conversations: [conversation] });
  });

  afterEach(() => cleanup());

  it('lists persisted conversations and loads a selected transcript', async () => {
    let resolveList: (value: { conversations: AgentConversation[] }) => void = () => undefined;
    vi.mocked(api.agent.listConversations).mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      })
    );
    vi.mocked(api.agent.getConversation).mockResolvedValue({ conversation, messages: transcript });
    render(<FloatingChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));
    expect(screen.getByText('Loading conversations...')).toBeTruthy();

    resolveList({ conversations: [conversation] });
    fireEvent.click(await screen.findByRole('button', { name: /Plan the week/ }));

    expect(api.agent.getConversation).toHaveBeenCalledWith('conversation-1');
    expect(await screen.findByText('What should I focus on?')).toBeTruthy();
    expect(screen.getByText('Start with the release checklist.')).toBeTruthy();
  });

  it('continues the selected conversation', async () => {
    vi.mocked(api.agent.getConversation).mockResolvedValue({ conversation, messages: transcript });
    vi.mocked(api.agent.sendMessage).mockResolvedValue({
      conversation: { ...conversation, updatedAt: '2026-09-23T11:00:00Z' },
      message: {
        id: 'message-3',
        role: 'assistant',
        content: 'Review the open pull requests.',
        createdAt: '2026-09-23T11:00:00Z',
      },
    });
    render(<FloatingChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));
    fireEvent.click(await screen.findByRole('button', { name: /Plan the week/ }));
    await screen.findByText('Start with the release checklist.');
    fireEvent.change(screen.getByPlaceholderText('Ask your agent anything...'), {
      target: { value: 'What next?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(api.agent.sendMessage).toHaveBeenCalledWith('conversation-1', 'What next?')
    );
    expect(api.agent.createConversation).not.toHaveBeenCalled();
    expect(await screen.findByText('Review the open pull requests.')).toBeTruthy();
  });

  it('creates a separate conversation when starting a new chat', async () => {
    const newConversation = { ...conversation, id: 'conversation-2', title: 'New conversation' };
    vi.mocked(api.agent.createConversation).mockResolvedValue({ conversation: newConversation });
    vi.mocked(api.agent.sendMessage).mockResolvedValue({
      conversation: newConversation,
      message: {
        id: 'message-4',
        role: 'assistant',
        content: 'Ready to help.',
        createdAt: '2026-09-23T12:00:00Z',
      },
    });
    render(<FloatingChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New' }));
    fireEvent.change(screen.getByPlaceholderText('Ask your agent anything...'), {
      target: { value: 'Start fresh' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(api.agent.createConversation).toHaveBeenCalledOnce());
    expect(api.agent.sendMessage).toHaveBeenCalledWith('conversation-2', 'Start fresh');
  });

  it('shows empty and failed history states without blocking a new chat', async () => {
    vi.mocked(api.agent.listConversations).mockRejectedValueOnce(new Error('offline'));
    render(<FloatingChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));
    expect(await screen.findByText('Could not load conversations.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New' })).toBeTruthy();

    vi.mocked(api.agent.listConversations).mockResolvedValueOnce({ conversations: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No conversations yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new chat' }));
    expect(screen.getByText('Start a conversation with your agent')).toBeTruthy();
  });
});

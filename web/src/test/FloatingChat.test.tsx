import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FloatingChat } from '@/components/agent/FloatingChat';
import { api } from '@/lib/api';
import type { AgentConversation, AgentConversationMessage } from '@/types';

vi.mock('@/lib/api', () => ({
  api: {
    agent: {
      createConversation: vi.fn(),
      listConversations: vi.fn(),
      getConversation: vi.fn(),
      sendMessage: vi.fn(),
      abort: vi.fn(),
    },
    smartboard: {
      getPanel: vi.fn(),
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

const markdownTranscript: AgentConversationMessage[] = [
  {
    id: 'message-markdown',
    role: 'assistant',
    content: '## Summary\n\n**Important**\n\n- First item',
    createdAt: '2026-09-23T10:00:01Z',
  },
];

const panelResponses = {
  'things-to-remember': {
    panelType: 'things-to-remember' as const,
    data: {
      items: [
        {
          id: 'remember-1',
          title: 'Release checklist',
          text: 'Review it',
          category: 'important' as const,
          source: 'notes',
          date: '2026-09-23',
        },
      ],
    },
    lastRefreshed: '2026-09-23T09:00:00Z',
  },
  suggestions: {
    panelType: 'suggestions' as const,
    data: {
      suggestions: [
        {
          id: 'suggestion-1',
          title: 'Delegate reporting',
          suggestion: 'Delegate it',
          reasoning: 'Save time',
          status: 'active' as const,
          createdAt: '2026-09-23T09:00:00Z',
        },
      ],
    },
    lastRefreshed: '2026-09-23T09:00:00Z',
  },
  achievements: {
    panelType: 'achievements' as const,
    data: { achievements: [] },
    lastRefreshed: '2026-09-23T09:00:00Z',
  },
  blockers: {
    panelType: 'blockers' as const,
    data: { blockers: [] },
    lastRefreshed: '2026-09-23T09:00:00Z',
  },
};

describe('FloatingChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.agent.listConversations).mockResolvedValue({ conversations: [conversation] });
    vi.mocked(api.smartboard.getPanel).mockImplementation(async (panelType) =>
      Promise.resolve(panelResponses[panelType])
    );
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
      expect(api.agent.sendMessage).toHaveBeenCalledWith(
        'conversation-1',
        'What next?',
        expect.any(String),
        []
      )
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
    expect(api.agent.sendMessage).toHaveBeenCalledWith(
      'conversation-2',
      'Start fresh',
      expect.any(String),
      []
    );
  });

  it('searches current cards and selects one with the keyboard', async () => {
    render(<FloatingChat />);
    const composer = screen.getByPlaceholderText('Ask your agent anything...');

    fireEvent.change(composer, { target: { value: '@release' } });

    expect(await screen.findByRole('listbox', { name: 'Smart Board cards' })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Release checklist/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Delegate reporting/ })).toBeNull();
    expect(api.smartboard.getPanel).toHaveBeenCalledTimes(4);

    fireEvent.change(composer, { target: { value: '@' } });
    fireEvent.keyDown(composer, { key: 'ArrowDown' });
    fireEvent.keyDown(composer, { key: 'Enter' });

    expect(screen.getByText('@ Delegate reporting')).toBeTruthy();
    expect((composer as HTMLInputElement).value).toBe('');
  });

  it('opens the panel picker with slash, dismisses it, and removes selected chips', async () => {
    render(<FloatingChat />);
    const composer = screen.getByPlaceholderText('Ask your agent anything...');

    fireEvent.change(composer, { target: { value: '/suggest' } });
    expect(await screen.findByRole('option', { name: 'Suggestions' })).toBeTruthy();
    fireEvent.keyDown(composer, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Smart Board panels' })).toBeNull();

    fireEvent.change(composer, { target: { value: '/' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Things to Remember' }));
    expect(screen.getByText('/ Things to Remember')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Things to Remember' }));
    expect(screen.queryByText('/ Things to Remember')).toBeNull();
  });

  it('sends compact contexts separately from the visible message', async () => {
    vi.mocked(api.agent.createConversation).mockResolvedValue({ conversation });
    vi.mocked(api.agent.sendMessage).mockResolvedValue({
      conversation,
      message: {
        id: 'message-context-response',
        role: 'assistant',
        content: 'Use the checklist.',
        createdAt: '2026-09-23T12:00:00Z',
      },
    });
    render(<FloatingChat />);
    const composer = screen.getByPlaceholderText('Ask your agent anything...');
    fireEvent.focus(composer);

    fireEvent.change(composer, { target: { value: '@release' } });
    fireEvent.click(await screen.findByRole('option', { name: /Release checklist/ }));
    fireEvent.change(composer, { target: { value: 'What should I do?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(api.agent.sendMessage).toHaveBeenCalledWith(
        'conversation-1',
        'What should I do?',
        expect.any(String),
        [
          {
            kind: 'card',
            panelType: 'things-to-remember',
            itemId: 'remember-1',
            label: 'Release checklist',
          },
        ]
      )
    );
    expect(screen.getByText('What should I do?')).toBeTruthy();
    expect(screen.queryByText('@release')).toBeNull();
  });

  it('renders context chips from persisted transcript messages', async () => {
    vi.mocked(api.agent.getConversation).mockResolvedValue({
      conversation,
      messages: [
        {
          ...transcript[0],
          contexts: [
            {
              kind: 'panel',
              panelType: 'blockers',
              label: 'Blockers',
            },
          ],
        },
      ],
    });
    render(<FloatingChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));
    fireEvent.click(await screen.findByRole('button', { name: /Plan the week/ }));

    expect(await screen.findByText('/ Blockers')).toBeTruthy();
    expect(screen.getByText('What should I focus on?')).toBeTruthy();
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

  it('renders assistant Markdown while keeping user content as plain text', async () => {
    vi.mocked(api.agent.getConversation).mockResolvedValue({
      conversation,
      messages: [{ ...transcript[0], content: '**plain user text**' }, ...markdownTranscript],
    });
    render(<FloatingChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));
    fireEvent.click(await screen.findByRole('button', { name: /Plan the week/ }));

    expect(await screen.findByRole('heading', { name: 'Summary' })).toBeTruthy();
    expect(screen.getByText('Important').tagName).toBe('STRONG');
    expect(screen.getByText('First item').closest('li')).toBeTruthy();
    expect(screen.getByText('**plain user text**').tagName).toBe('DIV');
  });

  it('expands and restores the chat panel within viewport bounds', async () => {
    render(<FloatingChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));

    const panel = screen.getByText('Conversations').closest<HTMLElement>('.overflow-hidden');
    expect(panel?.style.height).toBe('400px');
    expect(panel?.style.minHeight).toBe('280px');

    fireEvent.click(screen.getByRole('button', { name: 'Expand chat panel' }));
    expect(panel?.style.height).toBe('calc(100vh - 8rem)');
    expect(panel?.style.maxHeight).toBe('calc(100vh - 8rem)');
    expect(screen.getByRole('button', { name: 'Restore chat panel size' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Restore chat panel size' }));
    expect(panel?.style.height).toBe('400px');
  });

  it('stops an in-flight response and allows another message', async () => {
    vi.mocked(api.agent.getConversation).mockResolvedValue({ conversation, messages: transcript });
    vi.mocked(api.agent.abort).mockResolvedValue({ aborted: true, requestId: 'request-id' });
    vi.mocked(api.agent.sendMessage).mockReturnValue(new Promise(() => undefined));
    render(<FloatingChat />);

    fireEvent.click(screen.getByRole('button', { name: 'Expand agent chat' }));
    fireEvent.click(await screen.findByRole('button', { name: /Plan the week/ }));
    await screen.findByText('Start with the release checklist.');
    fireEvent.change(screen.getByPlaceholderText('Ask your agent anything...'), {
      target: { value: 'Long request' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    const stopButton = await screen.findByRole('button', { name: 'Stop response' });
    const requestId = vi.mocked(api.agent.sendMessage).mock.calls[0][2];
    fireEvent.click(stopButton);

    await waitFor(() => expect(api.agent.abort).toHaveBeenCalledWith(requestId));
    expect(screen.queryByRole('button', { name: 'Stop response' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeTruthy();
    expect(screen.getByText('Long request')).toBeTruthy();
    expect(screen.queryByText('Message failed to send. Your draft was restored.')).toBeNull();
  });
});

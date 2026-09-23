import {
  ArrowLeft,
  ChevronUp,
  History,
  Loader2,
  Maximize2,
  MessageSquarePlus,
  Minimize2,
  RefreshCw,
  Square,
  X,
} from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { RenderMarkdown } from '@/components/ui/RenderMarkdown';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import type {
  AgentConversation,
  AgentConversationMessage,
  AgentMessageContext,
  PanelType,
  SmartBoardPanelResponse,
} from '@/types';

type ChatView = 'history' | 'conversation';
type PickerKind = AgentMessageContext['kind'];

const PANEL_TYPES: PanelType[] = ['things-to-remember', 'suggestions', 'achievements', 'blockers'];

const PANEL_LABELS: Record<PanelType, string> = {
  'things-to-remember': 'Things to Remember',
  suggestions: 'Suggestions',
  achievements: 'Achievements',
  blockers: 'Blockers',
};

function getPanelItems(response: SmartBoardPanelResponse): Array<{ id: string; title: string }> {
  if (!response.data) return [];

  switch (response.panelType) {
    case 'things-to-remember':
      return 'items' in response.data ? response.data.items : [];
    case 'suggestions':
      return 'suggestions' in response.data ? response.data.suggestions : [];
    case 'achievements':
      return 'achievements' in response.data ? response.data.achievements : [];
    case 'blockers':
      return 'blockers' in response.data ? response.data.blockers : [];
  }
}

function contextKey(context: AgentMessageContext) {
  return `${context.kind}:${context.panelType}:${context.itemId ?? ''}`;
}

function sortConversations(conversations: AgentConversation[]) {
  return [...conversations].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
  );
}

export function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [view, setView] = useState<ChatView>('history');
  const [draft, setDraft] = useState('');
  const [conversations, setConversations] = useState<AgentConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AgentConversation | null>(null);
  const [messages, setMessages] = useState<AgentConversationMessage[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [contexts, setContexts] = useState<AgentMessageContext[]>([]);
  const [cardOptions, setCardOptions] = useState<AgentMessageContext[]>([]);
  const [pickerKind, setPickerKind] = useState<PickerKind | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerStart, setPickerStart] = useState(0);
  const [pickerIndex, setPickerIndex] = useState(0);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const stoppedRequestIdsRef = useRef(new Set<string>());
  const pickerLoadInFlightRef = useRef(false);

  const panelOptions: AgentMessageContext[] = PANEL_TYPES.map((panelType) => ({
    kind: 'panel',
    panelType,
    label: PANEL_LABELS[panelType],
  }));
  const pickerOptions = (pickerKind === 'card' ? cardOptions : panelOptions).filter((option) =>
    option.label.toLocaleLowerCase().includes(pickerQuery.toLocaleLowerCase())
  );

  const loadPickerData = async () => {
    if (pickerLoadInFlightRef.current) return;
    pickerLoadInFlightRef.current = true;
    setIsPickerLoading(true);
    setPickerError(false);
    try {
      const panels = await Promise.all(
        PANEL_TYPES.map((panelType) => api.smartboard.getPanel(panelType))
      );
      setCardOptions(
        panels.flatMap((panel) =>
          getPanelItems(panel).map((item) => ({
            kind: 'card' as const,
            panelType: panel.panelType,
            itemId: item.id,
            label: item.title,
          }))
        )
      );
    } catch {
      setPickerError(true);
    } finally {
      pickerLoadInFlightRef.current = false;
      setIsPickerLoading(false);
    }
  };

  const loadConversations = async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await api.agent.listConversations();
      setConversations(sortConversations(data.conversations));
    } catch (error) {
      setHistoryError(getErrorMessage(error));
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialConversations = async () => {
      setIsHistoryLoading(true);
      setHistoryError(null);
      try {
        const data = await api.agent.listConversations();
        setConversations(sortConversations(data.conversations));
      } catch (error) {
        setHistoryError(getErrorMessage(error));
      } finally {
        setIsHistoryLoading(false);
      }
    };

    void loadInitialConversations();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: New messages must trigger scrolling.
  useEffect(() => {
    if (view === 'conversation') {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [messages, isSending, view]);

  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (chatPanelRef.current && !chatPanelRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const openConversation = async (conversation: AgentConversation) => {
    setView('conversation');
    setActiveConversation(conversation);
    setMessages([]);
    setTranscriptError(null);
    setSendError(null);
    setIsTranscriptLoading(true);
    try {
      const data = await api.agent.getConversation(conversation.id);
      setActiveConversation(data.conversation);
      setMessages(data.messages);
    } catch (error) {
      setTranscriptError(getErrorMessage(error));
    } finally {
      setIsTranscriptLoading(false);
    }
  };

  const startNewConversation = () => {
    setView('conversation');
    setActiveConversation(null);
    setMessages([]);
    setTranscriptError(null);
    setSendError(null);
    setContexts([]);
    setPickerKind(null);
  };

  const updateConversationList = (conversation: AgentConversation) => {
    setConversations((current) =>
      sortConversations([conversation, ...current.filter((item) => item.id !== conversation.id)])
    );
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || isSending || isTranscriptLoading) return;
    const optimisticId = `pending-${Date.now()}`;
    const requestId = crypto.randomUUID();
    const messageContexts = contexts;
    activeRequestIdRef.current = requestId;

    setDraft('');
    setContexts([]);
    setPickerKind(null);
    setSendError(null);
    setIsSending(true);

    try {
      let conversation = activeConversation;
      if (!conversation) {
        const created = await api.agent.createConversation();
        conversation = created.conversation;
        setActiveConversation(conversation);
        updateConversationList(conversation);
      }

      const optimisticMessage: AgentConversationMessage = {
        id: optimisticId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        contexts: messageContexts,
      };
      setMessages((current) => [...current, optimisticMessage]);

      const data = await api.agent.sendMessage(
        conversation.id,
        content,
        requestId,
        messageContexts
      );
      if (stoppedRequestIdsRef.current.has(requestId)) return;
      setMessages((current) => [...current, data.message]);
      setActiveConversation(data.conversation);
      updateConversationList(data.conversation);
    } catch (error) {
      if (stoppedRequestIdsRef.current.has(requestId)) return;
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setSendError(getErrorMessage(error));
      setDraft(content);
      setContexts(messageContexts);
    } finally {
      stoppedRequestIdsRef.current.delete(requestId);
      if (activeRequestIdRef.current === requestId) {
        activeRequestIdRef.current = null;
        setIsSending(false);
      }
    }
  };

  const updateDraft = (value: string) => {
    setDraft(value);
    const match = /(^|\s)([@/])([^\s@/]*)$/.exec(value);
    if (!match) {
      setPickerKind(null);
      return;
    }

    const kind = match[2] === '@' ? 'card' : 'panel';
    setPickerKind(kind);
    setPickerQuery(match[3]);
    setPickerStart(match.index + match[1].length);
    setPickerIndex(0);
    if (kind === 'card' && pickerKind !== 'card') void loadPickerData();
  };

  const selectContext = (context: AgentMessageContext) => {
    setContexts((current) =>
      current.some((item) => contextKey(item) === contextKey(context))
        ? current
        : [...current, context]
    );
    setDraft((current) => current.slice(0, pickerStart).trimEnd());
    setPickerKind(null);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (pickerKind) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPickerKind(null);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (pickerOptions.length > 0) {
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          setPickerIndex(
            (current) => (current + direction + pickerOptions.length) % pickerOptions.length
          );
        }
        return;
      }
      if (event.key === 'Enter' && pickerOptions[pickerIndex]) {
        event.preventDefault();
        selectContext(pickerOptions[pickerIndex]);
        return;
      }
    }

    if (event.key === 'Enter') void handleSend();
  };

  const handleStop = async () => {
    const requestId = activeRequestIdRef.current;
    if (!requestId) return;

    stoppedRequestIdsRef.current.add(requestId);
    activeRequestIdRef.current = null;
    setIsSending(false);
    setSendError(null);

    try {
      await api.agent.abort(requestId);
    } catch (error) {
      stoppedRequestIdsRef.current.delete(requestId);
      setSendError(`Could not stop the response: ${getErrorMessage(error)}`);
    }
  };

  return (
    <div
      ref={chatPanelRef}
      className={`fixed bottom-8 left-1/2 z-50 w-[calc(100%-2rem)] -translate-x-1/2 transition-[max-width] duration-200 ${
        isMaximized ? 'max-w-[min(1100px,calc(100vw-2rem))]' : 'max-w-[600px]'
      }`}
    >
      <div
        className={`mb-2 overflow-hidden rounded-xl border border-default bg-[#0f0f0f] shadow-lg transition-all duration-300 ease-in-out ${
          isExpanded ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        style={{
          height: isExpanded ? (isMaximized ? 'calc(100vh - 8rem)' : '400px') : '0px',
          minHeight: isExpanded ? '280px' : '0px',
          maxHeight: 'calc(100vh - 8rem)',
          backgroundColor: '#0f0f0f',
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-default px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              {view === 'conversation' && (
                <button
                  type="button"
                  onClick={() => setView('history')}
                  aria-label="Conversation history"
                  className="rounded-full p-1 text-secondary transition-colors hover:bg-white/10 hover:text-primary"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="truncate text-sm font-medium text-primary">
                {view === 'history'
                  ? 'Conversations'
                  : activeConversation?.title || 'New conversation'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsMaximized((current) => !current)}
              aria-label={isMaximized ? 'Restore chat panel size' : 'Expand chat panel'}
              title={isMaximized ? 'Restore size' : 'Expand chat'}
              className="ml-auto rounded-full p-1 text-secondary transition-colors hover:bg-white/10 hover:text-primary"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={startNewConversation}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs text-secondary transition-colors hover:bg-white/10 hover:text-primary"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          {view === 'history' ? (
            <div className="flex-1 overflow-y-auto p-3">
              {isHistoryLoading ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversations...
                </div>
              ) : historyError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-sm text-secondary">Could not load conversations.</p>
                  <button
                    type="button"
                    onClick={() => void loadConversations()}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-primary hover:bg-white/15"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try again
                  </button>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <History className="h-5 w-5 text-secondary" />
                  <p className="text-sm text-secondary">No conversations yet.</p>
                  <button
                    type="button"
                    onClick={startNewConversation}
                    className="text-xs text-primary underline underline-offset-4"
                  >
                    Start a new chat
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <button
                      type="button"
                      key={conversation.id}
                      onClick={() => void openConversation(conversation)}
                      className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/10"
                    >
                      <span className="block truncate text-sm text-primary">
                        {conversation.title || 'Untitled conversation'}
                      </span>
                      <span className="mt-0.5 block text-xs text-secondary">
                        {new Date(conversation.updatedAt).toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              {isTranscriptLoading ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading conversation...
                </div>
              ) : transcriptError ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm text-secondary">Could not load this conversation.</p>
                  {activeConversation && (
                    <button
                      type="button"
                      onClick={() => void openConversation(activeConversation)}
                      className="text-xs text-primary underline underline-offset-4"
                    >
                      Try again
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.length === 0 && !isSending && (
                    <div className="py-8 text-center text-sm text-secondary">
                      Start a conversation with your agent
                    </div>
                  )}
                  {messages.map((item) => (
                    <div
                      key={item.id}
                      className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
                          item.role === 'user'
                            ? 'bg-highlight text-white'
                            : 'bg-white/10 text-primary'
                        }`}
                      >
                        {item.role === 'user' && item.contexts && item.contexts.length > 0 && (
                          <div className="mb-1.5 flex flex-wrap gap-1">
                            {item.contexts.map((context) => (
                              <span
                                key={contextKey(context)}
                                className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] text-white/90"
                              >
                                {context.kind === 'card' ? '@' : '/'} {context.label}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <RenderMarkdown>{item.content}</RenderMarkdown>
                          </div>
                        ) : (
                          item.content
                        )}
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-secondary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  )}
                  {sendError && (
                    <p role="alert" className="text-center text-xs text-red-400">
                      Message failed to send. Your draft was restored.
                    </p>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="relative rounded-2xl border border-default bg-[#0f0f0f] px-4 py-3 shadow-lg sm:px-6"
        style={{ backgroundColor: '#0f0f0f' }}
      >
        {pickerKind && (
          <div
            role="listbox"
            aria-label={pickerKind === 'card' ? 'Smart Board cards' : 'Smart Board panels'}
            className="absolute inset-x-0 bottom-full mb-2 max-h-56 overflow-y-auto rounded-xl border border-default bg-[#171717] p-1 shadow-xl"
          >
            {isPickerLoading ? (
              <p className="px-3 py-2 text-xs text-secondary">Loading Smart Board...</p>
            ) : pickerError && pickerKind === 'card' ? (
              <p className="px-3 py-2 text-xs text-red-400">Could not load Smart Board cards.</p>
            ) : pickerOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-secondary">No matching results.</p>
            ) : (
              pickerOptions.map((option, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={index === pickerIndex}
                  key={contextKey(option)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectContext(option)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    index === pickerIndex
                      ? 'bg-white/10 text-primary'
                      : 'text-secondary hover:bg-white/5'
                  }`}
                >
                  <span>{option.label}</span>
                  {option.kind === 'card' && (
                    <span className="ml-3 text-[11px] text-secondary">
                      {PANEL_LABELS[option.panelType]}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
        {contexts.length > 0 && (
          <fieldset
            className="mb-2 flex flex-wrap gap-1.5 border-0 pl-10"
            aria-label="Selected context"
          >
            {contexts.map((context) => (
              <span
                key={contextKey(context)}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-primary"
              >
                {context.kind === 'card' ? '@' : '/'} {context.label}
                <button
                  type="button"
                  aria-label={`Remove ${context.label}`}
                  onClick={() =>
                    setContexts((current) =>
                      current.filter((item) => contextKey(item) !== contextKey(context))
                    )
                  }
                  className="rounded-full text-secondary hover:text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </fieldset>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse agent chat' : 'Expand agent chat'}
            className={`rounded-full p-1.5 transition-all duration-300 hover:bg-white/10 ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <ChevronUp className="h-4 w-4 text-secondary" strokeWidth={1.5} />
          </button>

          <input
            type="text"
            value={draft}
            onFocus={() => {
              setIsExpanded(true);
              if (view === 'history') startNewConversation();
            }}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Ask your agent anything..."
            disabled={isSending || isTranscriptLoading}
            className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-secondary focus:outline-none disabled:opacity-60"
          />

          {isSending ? (
            <button
              type="button"
              onClick={() => void handleStop()}
              aria-label="Stop response"
              title="Stop response"
              className="rounded-full bg-white/10 p-1.5 text-primary transition-colors hover:bg-white/15"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSend()}
              aria-label="Send message"
              disabled={!draft.trim() || isTranscriptLoading}
              className="rounded-full p-1.5 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                className="h-4 w-4 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

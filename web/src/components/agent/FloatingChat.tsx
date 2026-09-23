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
import { createClientId } from '@/lib/clientId';
import { getErrorMessage } from '@/lib/errors';
import type {
  AgentActivity,
  AgentConversation,
  AgentConversationMessage,
  AgentFormValue,
  AgentInteractions,
  AgentMessageContext,
  PanelType,
  SmartBoardPanelResponse,
} from '@/types';

type ChatView = 'history' | 'conversation';
type PickerKind = AgentMessageContext['kind'];
type ActivityConnection = 'idle' | 'connecting' | 'connected' | 'reconnecting';
type DeliveryMode = 'steer' | 'queue';

const PANEL_TYPES: PanelType[] = ['things-to-remember', 'suggestions', 'achievements', 'blockers'];

const PANEL_LABELS: Record<PanelType, string> = {
  'things-to-remember': 'Things to Remember',
  suggestions: 'Suggestions',
  achievements: 'Achievements',
  blockers: 'Blockers',
};

const ACTIVITY_LABELS: Record<AgentActivity['kind'], string> = {
  status: 'Status',
  tool: 'Tool',
  file: 'File',
  mcp: 'MCP',
  reasoning: 'Reasoning',
  error: 'Error',
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

function sortMessages(messages: AgentConversationMessage[]) {
  return [...messages].sort((left, right) => {
    const byTime = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return byTime || left.id.localeCompare(right.id);
  });
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
  const [inFlightRequestIds, setInFlightRequestIds] = useState<Set<string>>(new Set());
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('queue');
  const [activity, setActivity] = useState<AgentActivity[]>([]);
  const [isActivityExpanded, setIsActivityExpanded] = useState(true);
  const [activityConnection, setActivityConnection] = useState<ActivityConnection>('idle');
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
  const [interactions, setInteractions] = useState<AgentInteractions>({
    permissions: [],
    forms: [],
  });
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [interactionBusy, setInteractionBusy] = useState<string | null>(null);
  const [settled, setSettled] = useState<Record<string, string>>({});
  const [formAnswers, setFormAnswers] = useState<Record<string, Record<string, AgentFormValue>>>(
    {}
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const activeRequestsRef = useRef(new Map<string, string>());
  const stoppedRequestIdsRef = useRef(new Set<string>());
  const conversationCreationRef = useRef<Promise<AgentConversation> | null>(null);
  const pickerLoadInFlightRef = useRef(false);
  const isSending = inFlightRequestIds.size > 0;

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

  const loadInteractions = async (conversation = activeConversation) => {
    if (!conversation) return;
    setInteractionLoading(true);
    setInteractionError(null);
    try {
      setInteractions(await api.agent.getInteractions(conversation.id));
    } catch (error) {
      setInteractionError(getErrorMessage(error));
    } finally {
      setInteractionLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: Conversation identity is the refresh boundary.
  useEffect(() => {
    if (!activeConversation || view !== 'conversation') return;
    void loadInteractions(activeConversation);
    const focusedRefresh = () => void loadInteractions(activeConversation);
    window.addEventListener('focus', focusedRefresh);
    return () => window.removeEventListener('focus', focusedRefresh);
  }, [activeConversation?.id, view]);

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reconnect only when the active stream identity changes.
  useEffect(() => {
    if (!isSending || !activeConversation) {
      setActivityConnection('idle');
      return;
    }
    if (typeof EventSource === 'undefined') {
      setActivityConnection('reconnecting');
      return;
    }

    const source = new EventSource(api.agent.activityUrl(activeConversation.id));
    setActivityConnection('connecting');
    source.onopen = () => setActivityConnection('connected');
    source.onmessage = (message) => {
      try {
        const next = JSON.parse(message.data) as AgentActivity;
        if (!next.id || !next.kind || !next.status || !next.title) return;
        setActivity((current) => {
          const withoutDuplicate = current.filter((item) => item.id !== next.id);
          return [...withoutDuplicate, next].slice(-20);
        });
        void loadInteractions(activeConversation);
      } catch {
        // Ignore malformed sidecar events; EventSource remains connected.
      }
    };
    source.onerror = () => setActivityConnection('reconnecting');
    return () => source.close();
  }, [activeConversation, isSending]);

  const openConversation = async (conversation: AgentConversation) => {
    setView('conversation');
    setActiveConversation(conversation);
    setMessages([]);
    setTranscriptError(null);
    setSendError(null);
    setActivity([]);
    setInteractions({ permissions: [], forms: [] });
    setSettled({});
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
    setActivity([]);
    setContexts([]);
    setPickerKind(null);
  };

  const updateConversationList = (conversation: AgentConversation) => {
    setConversations((current) =>
      sortConversations([conversation, ...current.filter((item) => item.id !== conversation.id)])
    );
  };

  const handleSend = async (retryMessage?: AgentConversationMessage) => {
    const content = retryMessage?.content || draft.trim();
    if (!content || isTranscriptLoading) return;
    const optimisticId = retryMessage?.id || createClientId();
    const requestId = createClientId();
    const messageContexts = retryMessage?.contexts || contexts;
    const selectedDelivery = retryMessage?.deliveryMode || deliveryMode;
    activeRequestsRef.current.set(requestId, optimisticId);
    setInFlightRequestIds((current) => new Set(current).add(requestId));

    if (!retryMessage) {
      setDraft('');
      setContexts([]);
      setPickerKind(null);
    }
    setSendError(null);
    setActivity([]);
    setIsActivityExpanded(true);
    setMessages((current) => {
      if (retryMessage) {
        return current.map((item) =>
          item.id === optimisticId
            ? { ...item, deliveryStatus: 'pending', deliveryError: undefined }
            : item
        );
      }
      return [
        ...current,
        {
          id: optimisticId,
          role: 'user' as const,
          content,
          createdAt: new Date().toISOString(),
          contexts: messageContexts,
          deliveryMode: selectedDelivery,
          deliveryStatus: 'pending' as const,
        },
      ];
    });

    try {
      let conversation = activeConversation;
      if (!conversation) {
        if (!conversationCreationRef.current) {
          conversationCreationRef.current = api.agent
            .createConversation()
            .then((created) => created.conversation)
            .finally(() => {
              conversationCreationRef.current = null;
            });
        }
        conversation = await conversationCreationRef.current;
        setActiveConversation(conversation);
        updateConversationList(conversation);
      }

      const data = await api.agent.sendMessage(
        conversation.id,
        content,
        requestId,
        messageContexts,
        selectedDelivery,
        optimisticId,
        retryMessage?.id
      );
      if (stoppedRequestIdsRef.current.has(requestId)) return;
      setMessages((current) => {
        const optimisticUser = current.find((item) => item.id === optimisticId);
        const persistedUser = data.userMessage || {
          id: optimisticId,
          role: 'user' as const,
          content,
          createdAt: optimisticUser?.createdAt || new Date().toISOString(),
          contexts: messageContexts,
          deliveryMode: selectedDelivery,
          deliveryStatus: 'accepted' as const,
        };
        return sortMessages([
          ...current.filter((item) => item.id !== persistedUser.id && item.id !== data.message.id),
          persistedUser,
          data.message,
        ]);
      });
      setActiveConversation(data.conversation);
      updateConversationList(data.conversation);
    } catch (error) {
      if (stoppedRequestIdsRef.current.has(requestId)) return;
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticId
            ? { ...item, deliveryStatus: 'failed', deliveryError: getErrorMessage(error) }
            : item
        )
      );
      setSendError(getErrorMessage(error));
    } finally {
      stoppedRequestIdsRef.current.delete(requestId);
      activeRequestsRef.current.delete(requestId);
      setInFlightRequestIds((current) => {
        const next = new Set(current);
        next.delete(requestId);
        return next;
      });
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
    const requests = [...activeRequestsRef.current.entries()];
    if (requests.length === 0) return;
    for (const [requestId] of requests) stoppedRequestIdsRef.current.add(requestId);
    activeRequestsRef.current.clear();
    setInFlightRequestIds(new Set());
    const stoppedMessageIds = new Set(requests.map(([, messageId]) => messageId));
    setMessages((current) =>
      current.map((item) =>
        stoppedMessageIds.has(item.id) && item.role === 'user'
          ? { ...item, deliveryStatus: 'failed', deliveryError: 'Stopped' }
          : item
      )
    );
    setSendError(null);

    try {
      await Promise.all(requests.map(([requestId]) => api.agent.abort(requestId)));
    } catch (error) {
      setSendError(`Could not stop the response: ${getErrorMessage(error)}`);
    }
  };

  const replyPermission = async (requestId: string, decision: 'once' | 'always' | 'reject') => {
    if (!activeConversation) return;
    setInteractionBusy(requestId);
    setInteractionError(null);
    try {
      await api.agent.replyPermission(activeConversation.id, requestId, decision);
      setSettled((current) => ({
        ...current,
        [requestId]:
          decision === 'reject'
            ? 'Rejected'
            : decision === 'always'
              ? 'Always allowed'
              : 'Allowed once',
      }));
    } catch (error) {
      setInteractionError(getErrorMessage(error));
    } finally {
      setInteractionBusy(null);
    }
  };

  const submitForm = async (formId: string) => {
    if (!activeConversation) return;
    const form = interactions.forms.find((item) => item.id === formId);
    if (!form) return;
    const answer = formAnswers[formId] || {};
    for (const field of form.fields.filter((item) => !item.hidden && item.type !== 'external')) {
      const value = answer[field.key] ?? field.default;
      if (
        field.required &&
        (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))
      ) {
        setFormErrors((current) => ({
          ...current,
          [formId]: `${field.title || field.key} is required.`,
        }));
        return;
      }
      if (typeof value === 'number' && field.type === 'integer' && !Number.isInteger(value)) {
        setFormErrors((current) => ({
          ...current,
          [formId]: `${field.title || field.key} must be an integer.`,
        }));
        return;
      }
      if (
        typeof value === 'string' &&
        ((field.minLength !== undefined && value.length < field.minLength) ||
          (field.maxLength !== undefined && value.length > field.maxLength))
      ) {
        setFormErrors((current) => ({
          ...current,
          [formId]: `${field.title || field.key} has an invalid length.`,
        }));
        return;
      }
      if (typeof value === 'string' && field.pattern) {
        try {
          if (!new RegExp(field.pattern).test(value)) {
            setFormErrors((current) => ({
              ...current,
              [formId]: `${field.title || field.key} has an invalid format.`,
            }));
            return;
          }
        } catch {
          /* OpenCode remains the validation authority for malformed patterns. */
        }
      }
      if (
        typeof value === 'number' &&
        ((typeof field.minimum === 'number' && value < field.minimum) ||
          (typeof field.maximum === 'number' && value > field.maximum))
      ) {
        setFormErrors((current) => ({
          ...current,
          [formId]: `${field.title || field.key} is outside the allowed range.`,
        }));
        return;
      }
      if (
        Array.isArray(value) &&
        ((field.minItems !== undefined && value.length < field.minItems) ||
          (field.maxItems !== undefined && value.length > field.maxItems))
      ) {
        setFormErrors((current) => ({
          ...current,
          [formId]: `${field.title || field.key} has an invalid number of selections.`,
        }));
        return;
      }
    }
    const complete = Object.fromEntries(
      form.fields.flatMap((field) => {
        const value = answer[field.key] ?? field.default;
        return value === undefined || field.type === 'external' ? [] : [[field.key, value]];
      })
    ) as Record<string, AgentFormValue>;
    setInteractionBusy(formId);
    setFormErrors((current) => ({ ...current, [formId]: '' }));
    try {
      await api.agent.replyForm(activeConversation.id, formId, complete);
      setSettled((current) => ({ ...current, [formId]: 'Submitted' }));
    } catch (error) {
      setFormErrors((current) => ({ ...current, [formId]: getErrorMessage(error) }));
    } finally {
      setInteractionBusy(null);
    }
  };

  const cancelForm = async (formId: string) => {
    if (!activeConversation) return;
    setInteractionBusy(formId);
    try {
      await api.agent.cancelForm(activeConversation.id, formId);
      setSettled((current) => ({ ...current, [formId]: 'Cancelled' }));
    } catch (error) {
      setFormErrors((current) => ({ ...current, [formId]: getErrorMessage(error) }));
    } finally {
      setInteractionBusy(null);
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
                        {item.role === 'user' && item.deliveryMode && item.deliveryStatus && (
                          <div className="mt-1.5 flex items-center justify-end gap-2 text-[11px] text-white/75">
                            <span>
                              {item.deliveryMode === 'steer' ? 'Steer' : 'Queue'} ·{' '}
                              {item.deliveryStatus === 'pending'
                                ? 'Pending'
                                : item.deliveryStatus === 'accepted'
                                  ? 'Accepted'
                                  : 'Failed'}
                            </span>
                            {item.deliveryStatus === 'pending' && (
                              <Loader2
                                aria-label="Message pending"
                                className="h-3 w-3 animate-spin"
                              />
                            )}
                            {item.deliveryStatus === 'failed' && (
                              <button
                                type="button"
                                onClick={() => void handleSend(item)}
                                className="font-medium text-white underline underline-offset-2"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {activeConversation &&
                    (interactionLoading ||
                      interactionError ||
                      interactions.permissions.length > 0 ||
                      interactions.forms.length > 0) && (
                      <section aria-label="Agent requests" className="space-y-2">
                        {interactionLoading &&
                          interactions.permissions.length === 0 &&
                          interactions.forms.length === 0 && (
                            <p className="flex items-center gap-2 text-xs text-secondary">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Checking for agent requests…
                            </p>
                          )}
                        {interactionError && (
                          <p role="alert" className="text-xs text-red-400">
                            Could not refresh agent requests. {interactionError}
                          </p>
                        )}
                        {interactions.permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs"
                          >
                            <p className="font-medium text-primary">
                              Permission requested: {permission.action}
                            </p>
                            {permission.message && (
                              <p className="mt-1 text-secondary">{permission.message}</p>
                            )}
                            {permission.resources.length > 0 && (
                              <p className="mt-1 break-all text-secondary">
                                {permission.resources.join(', ')}
                              </p>
                            )}
                            {settled[permission.id] ? (
                              <p className="mt-2 font-medium text-emerald-400">
                                {settled[permission.id]}
                              </p>
                            ) : (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={interactionBusy === permission.id}
                                  onClick={() => void replyPermission(permission.id, 'once')}
                                  className="rounded bg-white/10 px-2 py-1 text-primary disabled:opacity-50"
                                >
                                  Allow once
                                </button>
                                <button
                                  type="button"
                                  disabled={interactionBusy === permission.id}
                                  onClick={() => void replyPermission(permission.id, 'always')}
                                  className="rounded bg-white/10 px-2 py-1 text-primary disabled:opacity-50"
                                >
                                  Always allow
                                </button>
                                <button
                                  type="button"
                                  disabled={interactionBusy === permission.id}
                                  onClick={() => void replyPermission(permission.id, 'reject')}
                                  className="rounded bg-red-500/15 px-2 py-1 text-red-300 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                                {interactionBusy === permission.id && (
                                  <Loader2
                                    aria-label="Replying to permission"
                                    className="h-4 w-4 animate-spin"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {interactions.forms.map((form) => (
                          <div
                            key={form.id}
                            className="rounded-lg border border-blue-400/30 bg-blue-400/5 p-3 text-xs"
                          >
                            <p className="font-medium text-primary">{form.title}</p>
                            {settled[form.id] || form.state.status !== 'pending' ? (
                              <p
                                className={`mt-2 font-medium ${(settled[form.id] || form.state.status) === 'Cancelled' || form.state.status === 'cancelled' ? 'text-amber-400' : 'text-emerald-400'}`}
                              >
                                {settled[form.id] ||
                                  (form.state.status === 'answered' ? 'Submitted' : 'Cancelled')}
                              </p>
                            ) : (
                              <div className="mt-2 space-y-3">
                                {form.fields
                                  .filter((field) => !field.hidden)
                                  .map((field) => {
                                    const value =
                                      formAnswers[form.id]?.[field.key] ?? field.default;
                                    const update = (next: AgentFormValue) =>
                                      setFormAnswers((current) => ({
                                        ...current,
                                        [form.id]: { ...current[form.id], [field.key]: next },
                                      }));
                                    return (
                                      <div key={field.key} className="block text-secondary">
                                        <span className="mb-1 block text-primary">
                                          {field.title || field.key}
                                          {field.required ? ' *' : ''}
                                        </span>
                                        {field.description && (
                                          <span className="mb-1 block">{field.description}</span>
                                        )}
                                        {field.type === 'external' ? (
                                          <a
                                            href={field.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-300 underline"
                                          >
                                            Open external form
                                          </a>
                                        ) : field.type === 'boolean' ? (
                                          <input
                                            aria-label={field.title || field.key}
                                            type="checkbox"
                                            checked={Boolean(value)}
                                            onChange={(event) => update(event.target.checked)}
                                          />
                                        ) : field.type === 'multiselect' ? (
                                          <span className="flex flex-wrap gap-2">
                                            {field.options?.map((option) => {
                                              const selected = Array.isArray(value) ? value : [];
                                              return (
                                                <label
                                                  key={option.value}
                                                  className="flex items-center gap-1"
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={selected.includes(option.value)}
                                                    onChange={(event) =>
                                                      update(
                                                        event.target.checked
                                                          ? [...selected, option.value]
                                                          : selected.filter(
                                                              (item) => item !== option.value
                                                            )
                                                      )
                                                    }
                                                  />
                                                  {option.label}
                                                </label>
                                              );
                                            })}
                                          </span>
                                        ) : field.type === 'string' && field.options ? (
                                          <select
                                            aria-label={field.title || field.key}
                                            value={String(value ?? '')}
                                            onChange={(event) => update(event.target.value)}
                                            className="w-full rounded bg-white/10 p-2 text-primary"
                                          >
                                            <option value="">Select…</option>
                                            {field.options.map((option) => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <input
                                            aria-label={field.title || field.key}
                                            type={
                                              field.type === 'string'
                                                ? field.format === 'date-time'
                                                  ? 'datetime-local'
                                                  : field.format || 'text'
                                                : 'number'
                                            }
                                            step={field.type === 'integer' ? 1 : 'any'}
                                            min={
                                              typeof field.minimum === 'number'
                                                ? field.minimum
                                                : undefined
                                            }
                                            max={
                                              typeof field.maximum === 'number'
                                                ? field.maximum
                                                : undefined
                                            }
                                            minLength={field.minLength}
                                            maxLength={field.maxLength}
                                            placeholder={field.placeholder}
                                            value={value === undefined ? '' : String(value)}
                                            onChange={(event) =>
                                              update(
                                                field.type === 'string'
                                                  ? event.target.value
                                                  : event.target.value === ''
                                                    ? ''
                                                    : Number(event.target.value)
                                              )
                                            }
                                            className="w-full rounded bg-white/10 p-2 text-primary"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                {formErrors[form.id] && (
                                  <p role="alert" className="text-red-400">
                                    {formErrors[form.id]}
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    disabled={interactionBusy === form.id}
                                    onClick={() => void submitForm(form.id)}
                                    className="rounded bg-blue-500/20 px-2 py-1 text-blue-200 disabled:opacity-50"
                                  >
                                    Submit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={interactionBusy === form.id}
                                    onClick={() => void cancelForm(form.id)}
                                    className="rounded bg-white/10 px-2 py-1 text-secondary disabled:opacity-50"
                                  >
                                    Cancel
                                  </button>
                                  {interactionBusy === form.id && (
                                    <Loader2
                                      aria-label="Updating form"
                                      className="h-4 w-4 animate-spin"
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </section>
                    )}
                  {isSending && (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-white/10 bg-white/5 text-xs">
                        <button
                          type="button"
                          aria-expanded={isActivityExpanded}
                          aria-label={
                            isActivityExpanded ? 'Hide live activity' : 'Show live activity'
                          }
                          onClick={() => setIsActivityExpanded((current) => !current)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-secondary"
                        >
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Live activity
                          </span>
                          <span
                            className={
                              activityConnection === 'reconnecting' ? 'text-amber-400' : ''
                            }
                          >
                            {activityConnection === 'reconnecting'
                              ? 'Reconnecting…'
                              : activityConnection === 'connecting'
                                ? 'Connecting…'
                                : 'Working'}
                          </span>
                        </button>
                        {isActivityExpanded && (
                          <div
                            role="log"
                            aria-label="Live agent activity"
                            className="max-h-28 space-y-1 overflow-y-auto border-t border-white/10 px-3 py-2"
                          >
                            {activity.length === 0 ? (
                              <p className="text-secondary">Waiting for activity…</p>
                            ) : (
                              activity.map((item) => (
                                <div key={item.id} className="flex min-w-0 items-baseline gap-2">
                                  <span
                                    className={`shrink-0 font-medium ${item.kind === 'error' ? 'text-red-400' : 'text-secondary'}`}
                                  >
                                    {ACTIVITY_LABELS[item.kind]}
                                  </span>
                                  <span className="truncate text-primary" title={item.detail}>
                                    {item.title}
                                    {item.detail ? ` · ${item.detail}` : ''}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-start">
                        <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-secondary">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Thinking...
                        </div>
                      </div>
                    </div>
                  )}
                  {sendError && (
                    <p role="alert" className="text-center text-xs text-red-400">
                      Message failed to send. You can retry it from the transcript.
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
            disabled={isTranscriptLoading}
            className="min-w-0 flex-1 bg-transparent text-sm text-primary placeholder:text-secondary focus:outline-none disabled:opacity-60"
          />

          <select
            aria-label="Follow-up delivery"
            value={deliveryMode}
            onChange={(event) => setDeliveryMode(event.target.value as DeliveryMode)}
            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-1 text-xs text-secondary focus:outline-none"
          >
            <option value="queue">Queue</option>
            <option value="steer">Steer</option>
          </select>

          {isSending && (
            <button
              type="button"
              onClick={() => void handleStop()}
              aria-label="Stop response"
              title="Stop response"
              className="rounded-full bg-white/10 p-1.5 text-primary transition-colors hover:bg-white/15"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          )}
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
        </div>
      </div>
    </div>
  );
}

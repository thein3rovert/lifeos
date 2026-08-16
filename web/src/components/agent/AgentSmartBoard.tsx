import { toast } from '@/components/ui/Toast';
import {
  AchievementsPanel,
  BlockersPanel,
  SuggestionsPanel,
  ThingsToRememberPanel,
  getStateOptions,
  useScheduleStatus,
  useSmartBoardPanel,
} from '@/features/smartboard';
import { usePersistentState } from '@/hooks/usePersistentState';
import { api } from '@/lib/api';
import { toError } from '@/lib/errors';
import type {
  AchievementsData,
  BlockersData,
  PanelType,
  SuggestionsData,
  ThingsToRememberData,
} from '@/types';
import { FloatingChat } from './FloatingChat';
import { InlineCanvasEditor } from './InlineCanvasEditor';

export default function AgentSmartBoard() {
  // Panel hooks
  const thingsToRemember = useSmartBoardPanel<ThingsToRememberData>('things-to-remember');
  const suggestions = useSmartBoardPanel<SuggestionsData>('suggestions');
  const achievements = useSmartBoardPanel<AchievementsData>('achievements');
  const blockers = useSmartBoardPanel<BlockersData>('blockers');

  // Scheduler status (next refresh, last error per panel)
  const schedule = useScheduleStatus();

  // Canvas editor state — persisted to sessionStorage so the editor
  // survives nav away/back and same-tab hard refresh. Content is the
  // controlled draft (InlineCanvasEditor is controlled).
  const [editorOpen, setEditorOpen] = usePersistentState('lifeos:editor:open', false);
  const [editorContent, setEditorContent] = usePersistentState('lifeos:editor:content', '');
  const [editorTitle, setEditorTitle] = usePersistentState('lifeos:editor:title', '');
  const [editorContext, setEditorContext] = usePersistentState<{
    panelType: PanelType;
    itemId: string;
  } | null>('lifeos:editor:context', null);

  // Edit handlers
  const handleEditThingsToRemember = (itemId: string, text: string, title?: string) => {
    setEditorContent(text);
    setEditorTitle(title || 'Things to Remember');
    setEditorContext({ panelType: 'things-to-remember', itemId });
    setEditorOpen(true);
  };

  const handleEditSuggestion = (
    itemId: string,
    suggestion: string,
    reasoning: string,
    title?: string
  ) => {
    setEditorContent(`${suggestion}\n\n${reasoning}`);
    setEditorTitle(title || 'Suggestion');
    setEditorContext({ panelType: 'suggestions', itemId });
    setEditorOpen(true);
  };

  const handleEditAchievement = (itemId: string, achievement: string, title?: string) => {
    setEditorContent(achievement);
    setEditorTitle(title || 'Achievement');
    setEditorContext({ panelType: 'achievements', itemId });
    setEditorOpen(true);
  };

  const handleEditBlocker = (itemId: string, blocker: string, context: string, title?: string) => {
    setEditorContent(`${blocker}\n\n${context}`);
    setEditorTitle(title || 'Blocker');
    setEditorContext({ panelType: 'blockers', itemId });
    setEditorOpen(true);
  };

  // Save handler - updates the item content using the current draft
  const handleSaveEdit = async () => {
    if (!editorContext) return;

    try {
      const content = editorContent;
      // Parse content based on panel type
      let fields: Record<string, string> = {};

      switch (editorContext.panelType) {
        case 'things-to-remember':
          fields = { text: content };
          break;
        case 'suggestions': {
          const [suggestion, ...reasoningParts] = content.split('\n\n');
          fields = { suggestion, reasoning: reasoningParts.join('\n\n') };
          break;
        }
        case 'achievements':
          fields = { achievement: content };
          break;
        case 'blockers': {
          const [blocker, ...contextParts] = content.split('\n\n');
          fields = { blocker, context: contextParts.join('\n\n') };
          break;
        }
      }

      // Update via API
      await api.smartboard.updateItemContent(editorContext.itemId, editorContext.panelType, fields);

      // Refresh the panel data
      switch (editorContext.panelType) {
        case 'things-to-remember':
          await thingsToRemember.refresh();
          break;
        case 'suggestions':
          await suggestions.refresh();
          break;
        case 'achievements':
          await achievements.refresh();
          break;
        case 'blockers':
          await blockers.refresh();
          break;
      }

      // Close = discard: clear the draft so reopening starts fresh
      setEditorOpen(false);
      setEditorContent('');
      setEditorTitle('');
      setEditorContext(null);
    } catch (error) {
      const normalized = toError(error);
      console.error('Failed to save edit:', normalized);
      toast(normalized.message, 'error');
    }
  };

  // Close editor = discard the draft
  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditorContent('');
    setEditorTitle('');
    setEditorContext(null);
  };

  // inline state switcher for the rendered display (InlineCanvasEditor)
  const editorStateOptions = editorContext ? getStateOptions(editorContext.panelType) : undefined;
  const editorCurrentState = (() => {
    if (!editorContext) return undefined;
    switch (editorContext.panelType) {
      case 'things-to-remember':
        return thingsToRemember.data?.items.find((i) => i.id === editorContext.itemId)?.category;
      case 'suggestions':
        return suggestions.data?.suggestions.find((i) => i.id === editorContext.itemId)?.status;
      default:
        return undefined;
    }
  })();

  const handleChangeState = async (newState: string) => {
    if (!editorContext) return;
    switch (editorContext.panelType) {
      case 'things-to-remember':
        await thingsToRemember.updateItemStatus(editorContext.itemId, newState);
        break;
      case 'suggestions':
        await suggestions.updateItemStatus(editorContext.itemId, newState);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-primary relative pb-32">
      {/* Main content - 2-column layout with vertical divider */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-[1fr_1px_400px] gap-6">
          {/* Left Column - Things to Remember, Suggestions, Canvas Editor */}
          <div className="space-y-4">
            {/* Row 1: Things to Remember + Suggestions */}
            <div className="grid grid-cols-2 gap-4">
              {/* Things to Remember */}
              <div className="h-[350px]">
                <ThingsToRememberPanel
                  data={thingsToRemember.data}
                  loading={thingsToRemember.loading}
                  lastRefreshed={thingsToRemember.lastRefreshed}
                  onRefresh={thingsToRemember.refresh}
                  onEditItem={handleEditThingsToRemember}
                  nextRefresh={
                    schedule?.['things-to-remember']?.nextRefresh
                      ? new Date(schedule['things-to-remember'].nextRefresh)
                      : null
                  }
                  lastError={schedule?.['things-to-remember']?.lastError}
                  paused={schedule?.['things-to-remember']?.paused}
                />
              </div>

              {/* Suggestions/Coach */}
              <div className="h-[350px]">
                <SuggestionsPanel
                  data={suggestions.data}
                  loading={suggestions.loading}
                  lastRefreshed={suggestions.lastRefreshed}
                  onRefresh={suggestions.refresh}
                  onEditItem={handleEditSuggestion}
                  nextRefresh={
                    schedule?.suggestions?.nextRefresh
                      ? new Date(schedule.suggestions.nextRefresh)
                      : null
                  }
                  lastError={schedule?.suggestions?.lastError}
                  paused={schedule?.suggestions?.paused}
                />
              </div>
            </div>

            {/* Row 2: Canvas Editor (full width) */}
            <div className="h-[400px]">
              <div className="bg-secondary border border-default rounded-lg h-full">
                {editorOpen ? (
                  <InlineCanvasEditor
                    title={editorTitle}
                    content={editorContent}
                    onContentChange={setEditorContent}
                    onSave={handleSaveEdit}
                    onClose={handleCloseEditor}
                    stateOptions={editorStateOptions}
                    currentState={editorCurrentState}
                    onChangeState={handleChangeState}
                  />
                ) : (
                  /* Placeholder when nothing is being edited */
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-secondary mb-1">Edit Generated Content</p>
                      <p className="text-xs text-tertiary">
                        Click "Edit" on any item above to modify its content
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Vertical Divider Line */}
          <div className="w-px bg-[var(--color-border-default)]" />

          {/* Right Column - Achievements + Blockers */}
          <div className="space-y-4">
            {/* Achievements */}
            <div className="h-[350px]">
              <AchievementsPanel
                data={achievements.data}
                loading={achievements.loading}
                lastRefreshed={achievements.lastRefreshed}
                onRefresh={achievements.refresh}
                onEditItem={handleEditAchievement}
                nextRefresh={
                  schedule?.achievements?.nextRefresh
                    ? new Date(schedule.achievements.nextRefresh)
                    : null
                }
                lastError={schedule?.achievements?.lastError}
                paused={schedule?.achievements?.paused}
              />
            </div>

            {/* Blockers */}
            <div className="h-[400px]">
              <BlockersPanel
                data={blockers.data}
                loading={blockers.loading}
                lastRefreshed={blockers.lastRefreshed}
                onRefresh={blockers.refresh}
                onEditItem={handleEditBlocker}
                nextRefresh={
                  schedule?.blockers?.nextRefresh ? new Date(schedule.blockers.nextRefresh) : null
                }
                lastError={schedule?.blockers?.lastError}
                paused={schedule?.blockers?.paused}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Editor is now inline, not modal */}

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
}

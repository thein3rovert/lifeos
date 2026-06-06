import { useState } from 'react'
import { useSmartBoardPanel } from '@/hooks'
import { api } from '@/lib/api'
import {
  ThingsToRememberPanel,
  SuggestionsPanel,
  AchievementsPanel,
  BlockersPanel,
} from '@/components/agent'
import { InlineCanvasEditor } from './InlineCanvasEditor'
import { FloatingChat } from './FloatingChat'
import type {
  ThingsToRememberData,
  SuggestionsData,
  AchievementsData,
  BlockersData,
} from '@/types'

export default function AgentSmartBoard() {
  // Panel hooks
  const thingsToRemember = useSmartBoardPanel<ThingsToRememberData>('things-to-remember')
  const suggestions = useSmartBoardPanel<SuggestionsData>('suggestions')
  const achievements = useSmartBoardPanel<AchievementsData>('achievements')
  const blockers = useSmartBoardPanel<BlockersData>('blockers')

  // Canvas editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorContent, setEditorContent] = useState('')
  const [editorContext, setEditorContext] = useState<{
    panelType: string
    itemId: string
  } | null>(null)

  // Edit handlers
  const handleEditThingsToRemember = (itemId: string, text: string) => {
    setEditorContent(text)
    setEditorContext({ panelType: 'things-to-remember', itemId })
    setEditorOpen(true)
  }

  const handleEditSuggestion = (itemId: string, suggestion: string, reasoning: string) => {
    setEditorContent(`${suggestion}\n\n${reasoning}`)
    setEditorContext({ panelType: 'suggestions', itemId })
    setEditorOpen(true)
  }

  const handleEditAchievement = (itemId: string, achievement: string) => {
    setEditorContent(achievement)
    setEditorContext({ panelType: 'achievements', itemId })
    setEditorOpen(true)
  }

  const handleEditBlocker = (itemId: string, blocker: string, context: string) => {
    setEditorContent(`${blocker}\n\n${context}`)
    setEditorContext({ panelType: 'blockers', itemId })
    setEditorOpen(true)
  }

  // Save handler - updates the item content
  const handleSaveEdit = async (content: string) => {
    if (!editorContext) return

    try {
      // Parse content based on panel type
      let fields: Record<string, string> = {}

      switch (editorContext.panelType) {
        case 'things-to-remember':
          fields = { text: content }
          break
        case 'suggestions': {
          const [suggestion, ...reasoningParts] = content.split('\n\n')
          fields = { suggestion, reasoning: reasoningParts.join('\n\n') }
          break
        }
        case 'achievements':
          fields = { achievement: content }
          break
        case 'blockers': {
          const [blocker, ...contextParts] = content.split('\n\n')
          fields = { blocker, context: contextParts.join('\n\n') }
          break
        }
      }

      // Update via API
      await api.smartboard.updateItemContent(
        editorContext.itemId,
        editorContext.panelType,
        fields
      )

      // Refresh the panel data
      switch (editorContext.panelType) {
        case 'things-to-remember':
          await thingsToRemember.fetchData()
          break
        case 'suggestions':
          await suggestions.fetchData()
          break
        case 'achievements':
          await achievements.fetchData()
          break
        case 'blockers':
          await blockers.fetchData()
          break
      }

      setEditorOpen(false)
    } catch (error) {
      console.error('Failed to save edit:', error)
      // TODO: Show toast notification
    }
  }

  // Status change handlers
  const handleChangeCategory = async (itemId: string, category: string) => {
    await thingsToRemember.updateItemStatus(itemId, category)
  }

  const handleChangeSuggestionStatus = async (itemId: string, status: string) => {
    await suggestions.updateItemStatus(itemId, status)
  }

  return (
    <div className="min-h-screen bg-primary relative pb-32">
      {/* Header */}
      <div className="border-b border-default bg-secondary sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-lg font-medium text-primary">Smart Board</h1>
          <p className="text-xs text-secondary mt-1">
            AI-powered insights from your journals and meetings
          </p>
        </div>
      </div>

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
                  onChangeCategory={handleChangeCategory}
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
                  onChangeStatus={handleChangeSuggestionStatus}
                />
              </div>
            </div>

            {/* Row 2: Canvas Editor (full width) */}
            <div className="h-[400px]">
              <div className="bg-secondary border border-default rounded-lg h-full">
                {editorOpen ? (
                  <InlineCanvasEditor
                    content={editorContent}
                    onSave={handleSaveEdit}
                    onClose={() => setEditorOpen(false)}
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Editor is now inline, not modal */}

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  )
}

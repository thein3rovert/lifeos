import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Minimize2, Maximize2, Send, Loader2, Save, Upload, Plus } from 'lucide-react'
import { api, type ChatMessage, type Note } from '@/lib/api'

type SkillChatProps = {
  skillId: string
  skillTitle: string
  isOpen: boolean
  onClose: () => void
}

export function SkillChatModal({ skillId, skillTitle, isOpen, onClose }: SkillChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Note selection state
  const [notes, setNotes] = useState<Note[]>([])
  const [showNoteSelector, setShowNoteSelector] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([])
  const [noteFilter, setNoteFilter] = useState('')

  // Save note modal state
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [contentToSave, setContentToSave] = useState('')

  // Initialize session and load messages
  useEffect(() => {
    if (isOpen && skillId) {
      initializeChat()
    }
  }, [isOpen, skillId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const initializeChat = async () => {
    setInitializing(true)
    try {
      await api.chat.getOrCreateSession(skillId)
      const { messages: existingMessages } = await api.chat.getMessages(skillId)
      setMessages(existingMessages)
      const skillNotes = await api.notes.list(skillId)
      setNotes(skillNotes)
    } catch (err) {
      console.error('Failed to initialize chat:', err)
    } finally {
      setInitializing(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    const noteIdsToSend = selectedNotes.length > 0 ? selectedNotes.map(n => n.id) : undefined
    setInput('')

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created: new Date().toISOString(),
    }
    setMessages(prev => [...(prev || []), tempUserMsg])

    setLoading(true)
    try {
      const { response } = await api.chat.sendMessage(skillId, userMessage, noteIdsToSend)
      const assistantMsg: ChatMessage = {
        id: `temp-${Date.now()}-assistant`,
        role: 'assistant',
        content: response,
        created: new Date().toISOString(),
      }
      setMessages(prev => [...(prev || []), assistantMsg])
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => (prev || []).filter(m => m.id !== tempUserMsg.id))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    if (e.key === 'Escape' && showNoteSelector) {
      setShowNoteSelector(false)
      setNoteFilter('')
    }
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    if (value === '/') {
      setShowNoteSelector(true)
      setNoteFilter('')
    } else if (value.startsWith('/') && !value.includes(' ')) {
      setShowNoteSelector(true)
      setNoteFilter(value.slice(1).toLowerCase())
    } else {
      setShowNoteSelector(false)
      setNoteFilter('')
    }
  }

  const handleSelectNote = (note: Note) => {
    if (!selectedNotes.find(n => n.id === note.id)) {
      setSelectedNotes(prev => [...prev, note])
    }
    setInput('')
    setShowNoteSelector(false)
    setNoteFilter('')
  }

  const handleRemoveNoteContext = (noteId: number) => {
    setSelectedNotes(prev => prev.filter(n => n.id !== noteId))
  }

  const filteredNotes = (notes || []).filter(note =>
    note.title.toLowerCase().includes(noteFilter) &&
    !selectedNotes.find(n => n.id === note.id)
  )

  const handleUpdateExistingNote = async () => {
    if (!selectedNotes[0] || !contentToSave.trim()) return

    setSaving(true)
    try {
      await api.notes.update(skillId, selectedNotes[0].id, contentToSave)
      const updatedNotes = await api.notes.list(skillId)
      setNotes(updatedNotes)
      setContentToSave('')
      setShowSaveModal(false)
      setSelectedNotes([])
    } catch (err) {
      console.error('Failed to update note:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNewNote = async () => {
    if (!newNoteTitle.trim() || !contentToSave.trim()) return

    setSaving(true)
    try {
      await api.notes.add(skillId, newNoteTitle, contentToSave, 'ai-generated')
      const updatedNotes = await api.notes.list(skillId)
      setNotes(updatedNotes)
      setContentToSave('')
      setNewNoteTitle('')
      setShowSaveModal(false)
      setSelectedNotes([])
    } catch (err) {
      console.error('Failed to create note:', err)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  // Size classes based on state
  const sizeClass = fullscreen
    ? 'w-full h-full'
    : minimized
    ? 'w-[400px] h-[600px]'
    : 'w-[800px] h-[600px]'

  const positionClass = minimized
    ? 'items-end justify-end'
    : 'items-center justify-center'

  return (
    <div className={`fixed inset-0 flex z-50 ${minimized ? 'pointer-events-none' : ''} ${positionClass} ${
      minimized ? 'bg-transparent pr-4 pb-4' : 'bg-black/70 backdrop-blur-sm p-4'
    }`}>
      <div
        className={`flex flex-col transition-all duration-200 pointer-events-auto ${sizeClass} ${
          minimized ? 'rounded-l-lg' : 'rounded-lg'
        } bg-raised border border-subtle`}
        style={{
          maxHeight: minimized ? '100vh' : fullscreen ? '100%' : 'calc(100vh - 2rem)',
          boxShadow: 'var(--shadow-neuro-soft)',
        }}
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-default shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-highlight" strokeWidth={1.5} />
            <div>
              <p className="text-base font-medium text-white">
                {skillTitle}
              </p>
              <p className="text-xxs text-muted">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(!minimized)}
              className="p-1.5 hover:bg-hover rounded transition-colors"
              title={minimized ? 'Restore' : 'Minimize'}
            >
              <Minimize2 className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 hover:bg-hover rounded transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <Maximize2 className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-hover rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {initializing ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-muted animate-spin" strokeWidth={1.5} />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-12 h-12 text-muted mb-3" strokeWidth={1.5} />
              <p className="text-base text-secondary font-medium">Start a conversation</p>
              <p className="text-sm text-muted mt-1">
                Ask questions or request improvements for this skill
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 p-3 rounded-lg transition-all ${
                  msg.role === 'user' ? 'bg-elevated' : 'bg-raised'
                }`}
                style={{ boxShadow: 'var(--shadow-neuro-raised)' }}
              >
                <div
                  className={`w-1 rounded-full shrink-0 ${
                    msg.role === 'user' ? 'bg-highlight' : 'bg-muted'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xxs text-muted uppercase tracking-wide mb-1">
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </p>
                  <div className="text-sm text-secondary whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => {
                      setContentToSave(msg.content)
                      setShowSaveModal(true)
                    }}
                    className="h-8 w-8 flex items-center justify-center hover:bg-yellow-600/20 text-yellow-600 rounded shrink-0 transition-all"
                    title="Save to note"
                  >
                    <Save className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="w-1 rounded-full shrink-0 bg-muted" />
              <div className="flex-1">
                <p className="text-xxs text-muted uppercase tracking-wide mb-1">AI Assistant</p>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-default shrink-0 bg-input relative">
          {/* Note context badges */}
          {selectedNotes.length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-secondary">Context:</span>
              {selectedNotes.map(note => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-elevated"
                  style={{ boxShadow: 'var(--shadow-neuro-raised)' }}
                >
                  <span className="text-xs font-medium text-white">{note.title}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xxs ${
                      note.type === 'ai-generated'
                        ? 'bg-highlight-muted text-highlight'
                        : 'bg-warning-muted text-warning'
                    }`}
                  >
                    {note.type === 'ai-generated' ? 'AI' : 'Manual'}
                  </span>
                  <button
                    onClick={() => handleRemoveNoteContext(note.id)}
                    className="p-0.5 hover:bg-hover rounded transition-colors"
                    title="Remove context"
                  >
                    <X className="w-3 h-3 text-muted" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Note selector dropdown */}
          {showNoteSelector && notes.length > 0 && (
            <div
              className="absolute bottom-full left-4 right-4 mb-2 max-h-64 overflow-y-auto rounded-lg bg-raised border border-default"
              style={{ boxShadow: 'var(--shadow-neuro-soft)' }}
            >
              <div className="p-2 border-b border-default">
                <span className="text-xxs text-muted uppercase tracking-wide">Select a note to add as context</span>
              </div>
              {filteredNotes.length === 0 ? (
                <div className="p-4 text-center text-muted text-xs">No notes found</div>
              ) : (
                <div className="p-1">
                  {filteredNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleSelectNote(note)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-hover rounded-md transition-colors text-left"
                    >
                      <span className="flex-1 text-sm text-white truncate">{note.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xxs shrink-0 ${
                          note.type === 'ai-generated'
                            ? 'bg-highlight-muted text-highlight'
                            : 'bg-warning-muted text-warning'
                        }`}
                      >
                        {note.type === 'ai-generated' ? 'AI' : 'Manual'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-end gap-3">
            <div className="w-1 rounded-full bg-highlight shrink-0 self-stretch" />
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ENTER TEXT..."
              className="flex-1 min-h-[48px] max-h-32 px-3 py-3 rounded text-sm text-white placeholder:text-muted placeholder:uppercase placeholder:tracking-wide resize-none focus:outline-none transition-all bg-input"
              style={{ boxShadow: 'var(--shadow-neuro-inset)', border: 'none' }}
              rows={1}
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || loading}
              className={`h-12 w-12 flex items-center justify-center rounded shrink-0 transition-all active:scale-95 ${
                input.trim() && !loading
                  ? 'bg-highlight text-white'
                  : 'bg-highlight/50 text-white/70 cursor-not-allowed'
              }`}
              style={input.trim() && !loading ? { boxShadow: 'var(--shadow-neuro-raised)' } : {}}
              title="Send message"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
              ) : (
                <Send className="w-5 h-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Save Note Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div
            className="w-96 rounded-lg bg-raised border border-default"
            style={{ boxShadow: 'var(--shadow-neuro-soft)' }}
          >
            <div className="p-4 border-b border-default">
              <h3 className="text-md font-semibold text-white">Save Content to Note</h3>
              <p className="text-xs text-muted mt-1">Choose how to save your refined content</p>
            </div>

            <div className="p-4 space-y-3">
              <button
                onClick={handleUpdateExistingNote}
                disabled={saving}
                className="w-full p-3 rounded-md text-left hover:bg-hover transition-colors disabled:opacity-50 bg-elevated border border-default"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-yellow-600" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-white">Update existing note</span>
                </div>
                <p className="text-xxs text-muted">Append to: {selectedNotes[0]?.title}</p>
              </button>

              <div className="p-3 rounded-md bg-elevated border border-default">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-white">Create new note</span>
                </div>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Enter note title..."
                  className="w-full px-2 py-1.5 mb-2 rounded text-xs bg-black border border-default text-white placeholder:text-muted focus:outline-none focus:border-highlight"
                />
                <button
                  onClick={handleCreateNewNote}
                  disabled={!newNoteTitle.trim() || saving}
                  className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                >
                  {saving ? 'Creating...' : 'Create AI Note'}
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-default flex justify-end">
              <button
                onClick={() => { setShowSaveModal(false); setNewNoteTitle('') }}
                className="px-4 py-2 text-xs text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
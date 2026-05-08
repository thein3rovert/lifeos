import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Minimize2, Maximize2, Send, Loader2 } from 'lucide-react'
import { api, type ChatMessage } from '@/lib/api'

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
      // Create or resume session
      await api.chat.getOrCreateSession(skillId)
      // Load existing messages
      const { messages: existingMessages } = await api.chat.getMessages(skillId)
      setMessages(existingMessages)
    } catch (err) {
      console.error('Failed to initialize chat:', err)
    } finally {
      setInitializing(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')

    // Add user message optimistically
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      created: new Date().toISOString(),
    }
    setMessages(prev => [...(prev || []), tempUserMsg])

    setLoading(true)
    try {
      const { response } = await api.chat.sendMessage(skillId, userMessage)

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: `temp-${Date.now()}-assistant`,
        role: 'assistant',
        content: response,
        created: new Date().toISOString(),
      }
      setMessages(prev => [...(prev || []), assistantMsg])
    } catch (err) {
      console.error('Failed to send message:', err)
      // Remove optimistic message on error
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
  }

  if (!isOpen) return null

  // Size classes based on state
  const sizeClass = fullscreen
    ? 'w-full h-full'
    : minimized
    ? 'w-[480px] h-12'
    : 'w-[800px] h-[600px]'

  // Position - center when open, bottom-right when minimized
  const positionClass = minimized
    ? 'items-end justify-end'
    : 'items-center justify-center'

  return (
    <div className={`fixed inset-0 flex z-50 p-4 ${positionClass} ${
      minimized ? 'bg-transparent pointer-events-none' : 'bg-black/70 backdrop-blur-sm'
    }`}>
      <div
        className={`bg-raised border border-default rounded-lg shadow-2xl flex flex-col transition-all duration-200 pointer-events-auto ${sizeClass}`}
        style={{ maxHeight: fullscreen ? '100%' : 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-default shrink-0 bg-raised">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-highlight" strokeWidth={1.5} />
            <div>
              <p className="text-atlas-base font-medium text-white">
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

        {!minimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {initializing ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-muted animate-spin" strokeWidth={1.5} />
                </div>
              ) : !messages || messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-12 h-12 text-muted mb-3" strokeWidth={1.5} />
                  <p className="text-atlas-base text-secondary font-medium">Start a conversation</p>
                  <p className="text-atlas-sm text-muted mt-1">
                    Ask questions or request improvements for this skill
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex gap-3"
                  >
                    {/* Left accent bar */}
                    <div
                      className={`w-1 rounded-full shrink-0 ${
                        msg.role === 'user' ? 'bg-highlight' : 'bg-muted'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xxs text-muted uppercase tracking-wide mb-1">
                        {msg.role === 'user' ? 'You' : 'AI Assistant'}
                      </p>
                      <div className="text-atlas-sm text-secondary whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Typing indicator */}
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
            <div className="p-4 border-t border-default shrink-0 bg-input">
              <div className="flex items-end gap-3">
                <div className="w-1 rounded-full bg-highlight shrink-0 self-stretch" />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="ENTER TEXT..."
                  className="flex-1 min-h-[48px] max-h-32 px-3 py-3 bg-black border border-default rounded text-atlas-sm text-white placeholder:text-muted placeholder:uppercase placeholder:tracking-wide resize-none focus:outline-none focus:border-highlight"
                  rows={1}
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || loading}
                  className="h-12 w-12 flex items-center justify-center bg-highlight hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded shrink-0 transition-colors"
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
          </>
        )}
      </div>
    </div>
  )
}

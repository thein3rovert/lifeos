import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Minus, Send, Loader2, Maximize2 } from 'lucide-react'
import { api, type ChatMessage } from '@/lib/api'

type SkillChatProps = {
  skillId: string
  skillTitle: string
  isOpen: boolean
  onClose: () => void
}

export function SkillChat({ skillId, skillTitle, isOpen, onClose }: SkillChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [minimized, setMinimized] = useState(false)
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
    setMessages(prev => [...prev, tempUserMsg])

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
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      console.error('Failed to send message:', err)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
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

  return (
    <div
      className={`fixed bottom-4 right-4 bg-raised border border-default rounded-lg shadow-2xl flex flex-col z-50 transition-all duration-200 ${
        minimized ? 'w-80 h-14' : 'w-96 h-[600px]'
      }`}
      style={{ maxHeight: 'calc(100vh - 2rem)' }}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-default shrink-0 bg-raised">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MessageSquare className="w-4 h-4 text-highlight shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-atlas-base font-medium text-white truncate">
              {skillTitle}
            </p>
            <p className="text-xxs text-muted">AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1.5 hover:bg-hover rounded transition-colors"
            title={minimized ? 'Maximize' : 'Minimize'}
          >
            {minimized ? (
              <Maximize2 className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            ) : (
              <Minus className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            )}
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
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="w-8 h-8 text-muted mb-2" strokeWidth={1.5} />
                <p className="text-atlas-sm text-secondary">Start a conversation</p>
                <p className="text-xxs text-muted mt-1">
                  Ask questions about this skill
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-highlight text-white'
                        : 'bg-input text-secondary border border-default'
                    }`}
                  >
                    <p className="text-atlas-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-input text-secondary border border-default rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-default shrink-0 bg-raised">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this skill..."
                className="flex-1 min-h-[36px] max-h-24 px-3 py-2 bg-input border border-default rounded text-atlas-sm text-white placeholder:text-muted resize-none focus:outline-none focus:border-highlight"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || loading}
                className="h-9 w-9 flex items-center justify-center bg-highlight hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded shrink-0 transition-colors"
                title="Send message"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

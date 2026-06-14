import { ChevronUp, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Message = {
  role: string;
  content: string;
};

export default function AgentChatPage() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (chatPanelRef.current && !chatPanelRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await api.agent.chat(userMessage, sessionId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);

      // Save session ID for continuation
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);

      let errorMessage = "Sorry, I couldn't process that message.";
      if (error?.message?.includes('timeout') || error?.message?.includes('504')) {
        errorMessage =
          '⏱️ Request timed out. The agent might be processing a complex task or MCP is slow. Try again or simplify your request.';
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary relative">
      {/* Floating chat container */}
      <div
        ref={chatPanelRef}
        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50"
        style={{ width: '600px' }}
      >
        {/* Chat messages panel - slides up when expanded */}
        <div
          className={`
            bg-secondary 
            border border-default 
            rounded-xl 
            mb-2
            overflow-hidden
            transition-all duration-300 ease-in-out
            ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          `}
          style={{ height: isExpanded ? '400px' : '0px' }}
        >
          {/* Messages container */}
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-default">
              <h2 className="text-sm font-medium text-primary">Agent Assistant</h2>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-secondary text-sm py-8">
                  Start a conversation with your agent
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[80%] px-4 py-2 rounded-lg text-sm
                          ${
                            msg.role === 'user'
                              ? 'bg-accent text-on-accent'
                              : 'bg-tertiary text-primary'
                          }
                        `}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-3 py-2 bg-tertiary rounded-lg text-sm text-secondary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>💭 Thinking...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="bg-secondary border border-default rounded-full px-6 py-3 shadow-lg">
          <div className="flex items-center gap-3">
            {/* Expand/collapse button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`
                p-1.5 rounded-full 
                hover:bg-tertiary 
                transition-all duration-300
                ${isExpanded ? 'rotate-180' : 'rotate-0'}
              `}
            >
              <ChevronUp className="w-4 h-4 text-secondary" strokeWidth={1.5} />
            </button>

            {/* Input field */}
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask your agent anything..."
              className="flex-1 bg-transparent text-sm text-primary placeholder:text-secondary focus:outline-none"
            />

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!message.trim()}
              className="p-1.5 rounded-full hover:bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="w-4 h-4 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                role="img"
                aria-label="Send message"
              >
                <title>Send message</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

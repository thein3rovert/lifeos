import { useState, useRef, useEffect } from "react";
import { SendHorizontal, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

type Message = {
  role: string;
  content: string;
  status?: "streaming" | "complete";
};

export default function AgentChatPage() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, agentStatus]);

  // Connect to SSE for real-time agent updates
  useEffect(() => {
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/api/agent/events`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log("[Agent UI] Received SSE event:", payload.type, payload);
        
        if (payload.type === "message.part.updated") {
          // Show what the agent is doing
          const part = payload.properties.part;
          if (part.type === "tool") {
            setAgentStatus(`🔧 Using tool: ${part.name}`);
          } else if (part.type === "text" && payload.properties.delta) {
            // Stream text as it comes in
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.status === "streaming") {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + payload.properties.delta },
                ];
              } else {
                return [...prev, { role: "assistant", content: payload.properties.delta, status: "streaming" }];
              }
            });
          }
        } else if (payload.type === "session.status") {
          const status = payload.properties.status;
          if (status.type === "busy") {
            setAgentStatus("💭 Thinking...");
          } else if (status.type === "idle") {
            setAgentStatus("");
            // Mark last message as complete
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.status === "streaming") {
                return [...prev.slice(0, -1), { ...last, status: "complete" }];
              }
              return prev;
            });
          }
        } else if (payload.type === "message.updated") {
          setAgentStatus("");
          setIsLoading(false);
        } else if (payload.type === "connected") {
          console.log("[Agent UI] SSE connection established");
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        chatPanelRef.current &&
        !chatPanelRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, status: "complete" }]);
    setIsLoading(true);
    setAgentStatus("💭 Starting...");

    try {
      // SSE will handle streaming updates, but we still call the API
      // in case SSE misses something or for final confirmation
      const data = await api.agent.chat(userMessage, sessionId);
      
      // Only add response if SSE didn't already stream it
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content) {
          // SSE already added it, just mark complete
          return [...prev.slice(0, -1), { ...last, status: "complete" }];
        } else {
          // SSE missed it, add manually
          return [...prev, { role: "assistant", content: data.response, status: "complete" }];
        }
      });
      
      // Save session ID for continuation
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      
      let errorMessage = "Sorry, I couldn't process that message.";
      if (error?.message?.includes('timeout') || error?.message?.includes('504')) {
        errorMessage = "⏱️ Request timed out. The agent might be processing a complex task or MCP is slow. Try again or simplify your request.";
      }
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage, status: "complete" },
      ]);
    } finally {
      setIsLoading(false);
      setAgentStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-primary relative">
      {/* Floating chat container */}
      <div
        ref={chatPanelRef}
        className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50"
        style={{ width: "600px" }}
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
            ${isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
          `}
          style={{ height: isExpanded ? "400px" : "0px" }}
        >
          {/* Messages container */}
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-default">
              <h2 className="text-sm font-medium text-primary">
                Agent Assistant
              </h2>
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
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`
                          max-w-[80%] px-4 py-2 rounded-lg text-sm
                          ${
                            msg.role === "user"
                              ? "bg-accent text-on-accent"
                              : "bg-tertiary text-primary"
                          }
                        `}
                      >
                        {msg.content}
                        {msg.status === "streaming" && (
                          <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Agent status indicator */}
                  {agentStatus && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 px-3 py-2 bg-tertiary rounded-lg text-sm text-secondary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{agentStatus}</span>
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
              onClick={() => setIsExpanded(!isExpanded)}
              className={`
                p-1.5 rounded-full 
                hover:bg-tertiary 
                transition-all duration-300
                ${isExpanded ? "rotate-180" : "rotate-0"}
              `}
            >
              <ChevronUp className="w-4 h-4 text-secondary" strokeWidth={1.5} />
            </button>

            {/* Input field */}
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask your agent anything..."
              className="flex-1 bg-transparent text-sm text-primary placeholder:text-secondary focus:outline-none"
            />

            {/* Send button */}
            <button
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
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

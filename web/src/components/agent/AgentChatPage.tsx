import { useState, useRef, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export function AgentChatPage() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const chatPanelRef = useRef<HTMLDivElement>(null);

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
    if (!message.trim()) return;

    // Add user message
    const userMessage = { role: "user" as const, content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    // TODO: Call sidecar API
    // For now, just echo back
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm your agent assistant. (API integration coming soon)",
        },
      ]);
    }, 500);
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
                messages.map((msg, idx) => (
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
                    </div>
                  </div>
                ))
              )}
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

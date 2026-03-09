"use client";

import { useState, useRef, useEffect } from "react";
import { AIService } from "./AIService";
import { ToolExecutor } from "./ToolExecutor";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const aiService = useRef(new AIService());
  const toolExecutor = useRef(new ToolExecutor());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const endpoint = localStorage.getItem("ep_ai_endpoint") || "";
      const model = localStorage.getItem("ep_ai_model") || "";

      if (!endpoint) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Please configure your AI endpoint in Settings first.",
          },
        ]);
        setLoading(false);
        return;
      }

      const response = await aiService.current.chat(
        [...messages, userMessage],
        endpoint,
        model
      );

      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          await toolExecutor.current.execute(
            toolCall.name,
            toolCall.arguments
          );
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.content },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div
      className="w-80 border-l border-gray-700 flex flex-col"
      style={{ backgroundColor: "#16162a" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <h3 className="text-gray-300 font-semibold text-xs uppercase tracking-wider">
          AI Assistant
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-gray-500 text-xs text-center py-8">
            <p>AI Assistant ready.</p>
            <p className="mt-1">Configure endpoint in Settings.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs p-2 rounded ${
              msg.role === "user"
                ? "bg-blue-600/20 text-blue-200 ml-4"
                : "bg-gray-700/50 text-gray-300 mr-4"
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="text-gray-500 text-xs p-2 animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-700">
        <div className="flex gap-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask AI to help..."
            className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-600 rounded text-gray-200 text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

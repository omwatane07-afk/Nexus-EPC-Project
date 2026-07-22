"use client";

import React, { useState, useRef, useEffect } from 'react';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface DashboardState {
  fileName: string | null;
  analyzed: boolean;
  clashes: any[];
  mitigations: any[];
  nodes: any[];
  edges: any[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  date: string;
  dashboardState?: DashboardState;
}

interface ChatPanelProps {
  activeConversation: Conversation | null;
  onSendMessage: (text: string) => void;
  isGenerating: boolean;
  onTriggerUpload?: () => void;
  onCancelRequest?: () => void;
  fileName?: string | null;
  isOpen: boolean;
}

export default function ChatPanel({
  activeConversation,
  onSendMessage,
  isGenerating,
  onTriggerUpload,
  onCancelRequest,
  fileName,
  isOpen
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    onSendMessage(input);
    setInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isGenerating]);

  if (!activeConversation) {
    return (
      <div className="relative h-full flex flex-col">
        <div className={`flex flex-col items-center justify-center h-full text-center p-6 text-gray-500 bg-[#070913]/30 border border-gray-800/80 rounded-xl transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <svg className="w-12 h-12 mb-3 text-gray-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-400">No Chat Selected</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">Use the chat history to open or create a new session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className={`flex flex-col h-full bg-[#080a14]/60 border border-gray-800/80 rounded-xl overflow-hidden glass-panel transition-all duration-300 ${
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>

      {/* Chat Header */}
      <div className="p-4 border-b border-gray-800/80 bg-gray-950/40 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-wide">{activeConversation.title}</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Nexus EPC Intelligent Assistant</p>
        </div>
        {fileName && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/30 border border-cyan-800/50 text-[10px] text-cyan-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            {fileName}
          </div>
        )}
      </div>

      {/* Messages Window */}
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {activeConversation.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-10">
            <div className="w-10 h-10 rounded-full bg-cyan-950/20 border border-cyan-800/30 flex items-center justify-center text-cyan-400">
              ⚡
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-300">Start the Discussion</p>
              <p className="text-[11px] text-gray-500 max-w-[220px]">Ask how to resolve current layout clashes or double-check thermal parameters.</p>
            </div>

            {/* Quick action chips */}
            <div className="flex flex-col gap-1.5 w-full max-w-xs pt-2">
              <button 
                onClick={() => onSendMessage("Explain current MEP liquid cooling clash details.")}
                className="text-left px-3 py-2 rounded-lg border border-gray-800 hover:border-cyan-800 bg-gray-950/50 text-gray-400 hover:text-cyan-300 text-xs transition-all"
              >
                🔍 Analyze current layout conflicts
              </button>
              <button 
                onClick={() => onSendMessage("What is the clearance requirement for 480V trays?")}
                className="text-left px-3 py-2 rounded-lg border border-gray-800 hover:border-cyan-800 bg-gray-950/50 text-gray-400 hover:text-cyan-300 text-xs transition-all"
              >
                📏 Check electrical tray clearance code
              </button>
              {onTriggerUpload && (
                <button 
                  onClick={onTriggerUpload}
                  className="text-left px-3 py-2 rounded-lg border border-gray-800 hover:border-cyan-800 bg-gray-950/50 text-gray-400 hover:text-cyan-300 text-xs transition-all"
                >
                  📁 Upload another project blueprint PDF
                </button>
              )}
            </div>
          </div>
        ) : (
          activeConversation.messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed transition-all ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none shadow-[0_0_10px_rgba(37,99,235,0.2)]' 
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div className="text-[9px] text-gray-400 mt-1 text-right select-none opacity-60">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-gray-900 border border-gray-800 text-gray-400 rounded-xl rounded-bl-none px-4 py-3 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
                <span>Nexus Copilot is thinking...</span>
              </div>
              {onCancelRequest && (
                <button 
                  onClick={onCancelRequest}
                  className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/30 hover:bg-red-900/50 border border-red-900/50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-850/80 bg-gray-950/50 flex gap-2">
        <input 
          id="chat-input"
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isGenerating ? "Wait for AI response..." : "Ask Copilot a question... (e.g. 'How to reroute?')" }
          disabled={isGenerating}
          className="flex-grow bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isGenerating}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-medium text-xs transition-all shadow-[0_0_10px_rgba(37,99,235,0.2)] flex items-center justify-center"
        >
          Send
        </button>
      </form>
    </div>
  </div>
  );
}

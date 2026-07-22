"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Drawer from '@/components/Drawer';
import Logo from '@/components/Logo';
import SettingsModal from '@/components/SettingsModal';
import Dashboard from '@/components/Dashboard';
import ChatPanel, { Conversation, Message, DashboardState } from '@/components/ChatPanel';
import { HotkeyConfig, DEFAULT_HOTKEYS } from '@/components/HotkeySettings';

export default function Home() {
  // Navigation & panels state
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'graph' | 'chat' | 'dashboard'>('dashboard');
  const [chatPanelOpen, setChatPanelOpen] = useState(true);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hotkeys state
  const [hotkeys, setHotkeys] = useState<HotkeyConfig[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nexus_hotkeys');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Error loading hotkeys", e);
        }
      }
    }
    return DEFAULT_HOTKEYS;
  });

  // Save hotkeys to localStorage
  useEffect(() => {
    localStorage.setItem('nexus_hotkeys', JSON.stringify(hotkeys));
  }, [hotkeys]);

  const [triggerUpload, setTriggerUpload] = useState(0);
  const [triggerAnalysis, setTriggerAnalysis] = useState(0);

  // Toast notifications
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    // Initial mock conversations
    return [
      {
        id: 'convo-1',
        title: 'MEP 300kW Thermal Retrofit',
        date: '10:45 AM',
        dashboardState: {
          fileName: 'mock_blueprint_clash.pdf',
          analyzed: true,
          clashes: [
             { type: "CRITICAL_THERMAL_CLASH", nodes: ["LC-101", "HV-202"], description: "Liquid cooling line LC-101 is dangerously close to high-voltage tray HV-202.", severity: "HIGH" }
          ],
          mitigations: [
             { clash_id: "LC-101-HV-202", moving_node: "LC-101", node_dimension: "150mm diameter", suggested_reroute: { x: 140, y: 520, z: 2800, w: 10, h: 500, unit: "mm" }, mitigation_strategy: "A* Bypass", message: "Reroute LC-101 to x:140, y:520, z:2800" }
          ],
          nodes: [
            { id: 'LC-101', position: { x: 100, y: 200 }, data: { label: 'LC-101 (Liquid Cooling)' }, style: { background: '#1e3a8a', color: '#fff', border: '2px solid #3b82f6', width: 150 } },
            { id: 'HV-202', position: { x: 50, y: 400 }, data: { label: 'HV-202 (480V Tray)' }, style: { background: '#7f1d1d', color: '#fff', border: '2px solid #ef4444', width: 200 } },
            { id: 'SRV-300KW', position: { x: 120, y: 750 }, data: { label: 'DGX SuperPOD Rack' }, style: { background: '#064e3b', color: '#fff', border: '2px solid #10b981', width: 180 } }
          ],
          edges: [{
            id: 'e1', source: 'LC-101', target: 'HV-202', animated: true,
            style: { stroke: '#ef4444', strokeWidth: 3 },
            label: 'CRITICAL CLASH', labelStyle: { fill: '#ef4444', fontWeight: 700 },
            markerEnd: { type: 'arrowclosed', color: '#ef4444' }
          }]
        },
        messages: [
          { id: '1', sender: 'assistant', text: 'MEP Thermal Clash Engine is active.\nI have processed the blueprint and identified 1 critical spatial conflict between the Liquid Cooling loop (LC-101) and the 480V Busway Tray (HV-202) at coordinates [100, 400].\n\nHow would you like to proceed?', timestamp: '10:45 AM' },
          { id: '2', sender: 'user', text: 'What is the suggested reroute details?', timestamp: '10:46 AM' },
          { id: '3', sender: 'assistant', text: 'Suggested reroute coordinates for Liquid Cooling loop (LC-101) are:\nx: 140.0, y: 520.0, w: 10.0, h: 500.0\n\nThis will clear the 480V tray and achieve standard safety clearance of 4.2 feet.', timestamp: '10:47 AM' }
        ]
      },
      {
        id: 'convo-2',
        title: 'NEC Code Compliance Check',
        date: 'Yesterday',
        messages: [
          { id: '1', sender: 'user', text: 'What is the NEC code clearance for 480V tray near water lines?', timestamp: '3:45 PM' },
          { id: '2', sender: 'assistant', text: 'According to NEC Article 110.26 and ASHRAE TC 9.9 standards, keep a minimum of 36 inches separation. The suggested reroute shifts LC-101 to x:140, y:520, which yields 50 inches of clearance, well above code.', timestamp: '3:46 PM' }
        ]
      }
    ];
  });
  const [activeConvoId, setActiveConvoId] = useState<string | null>('convo-1');
  const [isGenerating, setIsGenerating] = useState(false);

  // New Chat Handler
  const handleNewConversation = useCallback(() => {
    const newId = `convo-${Date.now()}`;
    const newConvo: Conversation = {
      id: newId,
      title: `Conversation ${conversations.length + 1}`,
      date: 'Just now',
      messages: [
        {
          id: 'welcome',
          sender: 'assistant',
          text: 'Hello! I am the Nexus EPC Copilot. Ask me about thermal analysis, pipeline clashes, or electrical spacing regulations in your data center retrofit project.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      dashboardState: undefined
    };
    setConversations(prev => [newConvo, ...prev]);
    setActiveConvoId(newId);
    setChatPanelOpen(true);
    
    // Focus the chat input box
    setTimeout(() => {
      document.getElementById('chat-input')?.focus();
    }, 100);
  }, [conversations.length]);

  const handleDashboardStateChange = useCallback((newState: DashboardState) => {
    setConversations(prev => prev.map(convo => {
      if (convo.id === activeConvoId) {
        return { ...convo, dashboardState: newState };
      }
      return convo;
    }));
  }, [activeConvoId]);

  // Execute Action for a hotkey trigger
  const executeHotkeyAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'new-chat':
        handleNewConversation();
        showToast("Shortcut Triggered: New Chat Created!");
        break;
      case 'toggle-drawer':
        setLeftPanelOpen(prev => !prev);
        break;
      case 'upload-blueprint':
        setTriggerUpload(prev => prev + 1);
        showToast("Shortcut Triggered: Opening Blueprint PDF File Upload Dialog");
        break;
      case 'trigger-analysis':
        setTriggerAnalysis(prev => prev + 1);
        showToast("Shortcut Triggered: Running MEP Clash Analysis");
        break;
      case 'reset-workspace':
        handleDashboardStateChange({ fileName: null, analyzed: false, clashes: [], mitigations: [], nodes: [], edges: [] });
        showToast("Shortcut Triggered: Workspace Reset Complete");
        break;
      case 'show-alert':
        showToast("Copilot System Online • 300kW Clash Engine Ready");
        break;
      default:
        break;
    }
  }, [handleNewConversation, showToast]);

  // Global Keydown Listener for Hotkeys
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not trigger hotkeys if user is editing inside input/textarea
      const activeEl = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeEl === 'input' || activeEl === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true';
      
      // Allow Escape key to exit recording state in sub-components, handled there
      if (isInput) return;

      const key = e.key.toLowerCase();

      // Find if pressed key matches any of our registered hotkeys
      const matchedHotkey = hotkeys.find(hk => {
        return e.ctrlKey === hk.ctrlKey &&
               e.altKey === hk.altKey &&
               e.shiftKey === hk.shiftKey &&
               key === hk.key.toLowerCase();
      });

      if (matchedHotkey) {
        e.preventDefault();
        e.stopPropagation();
        executeHotkeyAction(matchedHotkey.actionId);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [hotkeys, executeHotkeyAction]);

  // Settings click toggle settings modal
  const handleSettingsClick = () => {
    setSettingsModalOpen(true);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConvoId(id);
    setChatPanelOpen(true);
  };

  // Real LLM API Integration via Perplexity
  const handleSendMessage = async (text: string) => {
    if (!activeConvoId) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp
    };

    let currentMessages: Message[] = [];

    // Update conversation with user message
    setConversations(prev => prev.map(convo => {
      if (convo.id === activeConvoId) {
        const isDefaultTitle = convo.title.startsWith('Conversation ');
        const title = isDefaultTitle ? (text.length > 25 ? text.substring(0, 25) + '...' : text) : convo.title;
        currentMessages = [...convo.messages, userMsg];
        return { ...convo, title, messages: currentMessages };
      }
      return convo;
    }));

    setIsGenerating(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Aggressive sliding window: last 4 messages (max 2 message pairs)
      let windowMessages = currentMessages.slice(-4).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      
      // Parity Enforcement: Ensure the array always starts with a user prompt
      if (windowMessages.length > 0 && windowMessages[0].role === 'assistant') {
        windowMessages = windowMessages.slice(1);
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: windowMessages }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        let errorDetail = response.statusText || response.status;
        try {
          const errData = await response.json();
          if (errData.detail) errorDetail = errData.detail;
        } catch(e) {}
        
        if (response.status === 429) {
          throw new Error("Rate limited (429). Please wait a moment before sending another request.");
        }
        throw new Error(`API Error: ${errorDetail}`);
      }

      const data = await response.json();
      
      const aiMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: data.reply || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversations(prev => prev.map(convo => {
        if (convo.id === activeConvoId) {
          return { ...convo, messages: [...convo.messages, aiMsg] };
        }
        return convo;
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        showToast("AI Request Cancelled.");
      } else {
        console.error("Chat error:", error);
        showToast(error.message || "Failed to communicate with AI.");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRenameConversation = useCallback((id: string, newTitle: string) => {
    setConversations(prev => prev.map(convo => {
      if (convo.id === id) {
        return { ...convo, title: newTitle };
      }
      return convo;
    }));
  }, []);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(convo => convo.id !== id);
      if (activeConvoId === id) {
        setActiveConvoId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
    showToast("Conversation deleted");
  }, [activeConvoId, showToast]);

  const activeConversation = conversations.find(c => c.id === activeConvoId) || null;

  return (
    <main className="flex h-screen bg-[#05060b] text-gray-100 font-sans overflow-hidden">
      
      {/* Suspended Logo in Free Space */}
      <Logo 
        size={44}
        onClick={() => setLeftPanelOpen(prev => !prev)}
        className="fixed top-3.5 left-3.5 z-50 transition-all duration-300 hover:scale-105"
      />

      {/* Transparent Backdrop overlay for Left Panel */}
      {leftPanelOpen && (
        <div 
          onClick={() => setLeftPanelOpen(false)} 
          className="fixed inset-0 z-30 bg-transparent"
        />
      )}

      {/* Merged Left Panel */}
      <div 
        className={`fixed top-0 left-0 h-screen bg-[#070912] border-r border-gray-900/80 shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-40 transition-transform duration-300 ease-in-out flex ${
          leftPanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 320 }}
      >
        <Drawer 
          conversations={conversations}
          activeConversationId={activeConvoId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onClose={() => setLeftPanelOpen(false)}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Main Screen Layout Container (shifts right when sidebar is open) */}
      <div 
        className="flex-grow flex flex-col h-full overflow-hidden relative transition-all duration-300 ease-in-out"
        style={{ marginLeft: leftPanelOpen ? '320px' : '0px' }}
      >
        
        {/* Toast Alerts Layer */}
        {toast && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#0c1a30] border border-cyan-500 text-cyan-300 px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] text-xs font-semibold tracking-wide flex items-center gap-2 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            {toast}
          </div>
        )}

        {/* Global Stats Header Bar with App Name */}
        <div className="h-14 border-b border-gray-900/60 bg-[#070912]/80 backdrop-blur-md pl-20 pr-6 flex items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-wider text-white bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">Nexus EPC</h1>
          </div>
        </div>

        {/* Work Area split panel */}
        <div className={`flex-grow flex p-6 h-[calc(100vh-56px)] overflow-hidden transition-all duration-300 ${
          chatPanelOpen ? 'gap-6' : 'gap-0'
        }`}>
          
          {/* Spatial visualizer (Dashboard) taking 2/3 of space if chat is open, or full space */}
          <div className={`transition-all duration-300 h-full overflow-hidden ${
            chatPanelOpen ? 'w-2/3' : 'w-full'
          }`}>
            <Dashboard 
              triggerUpload={triggerUpload}
              triggerAnalysis={triggerAnalysis}
              onAnalysisSuccess={(fn) => {
                showToast(`Loaded blueprint: ${fn}`);
              }}
              dashboardState={activeConversation?.dashboardState}
              onStateChange={handleDashboardStateChange}
            />
          </div>

          {/* Interactive Chat Panel taking 1/3 of space or collapsed */}
          <div 
            className={`h-full shrink-0 flex flex-col transition-all duration-300 ease-in-out relative overflow-visible ${
              chatPanelOpen ? 'w-1/3' : 'w-[0px]'
            }`}
          >
            {/* Dynamic Floating Chat Panel Toggle Handle */}
            <button
              type="button"
              onClick={() => setChatPanelOpen(prev => !prev)}
              className="absolute top-1/2 -translate-y-1/2 -left-[12px] w-[24px] h-[80px] bg-[#0b0c16]/95 hover:bg-[#121424] border border-cyan-500/30 hover:border-cyan-400 rounded-md flex items-center justify-center text-cyan-500 hover:text-cyan-300 transition-all z-50 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)] focus:outline-none pointer-events-auto"
              title={chatPanelOpen ? "Hide Chat" : "Show Chat"}
            >
              <span className="text-[10px] transform transition-transform duration-300 font-bold">
                {chatPanelOpen ? "▶" : "◀"}
              </span>
            </button>

            {/* Inner wrapper to handle layout hiding without fading the absolute button */}
            <div className={`w-full h-full transition-opacity duration-300 ${
              chatPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
              <ChatPanel 
                activeConversation={activeConversation}
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                onTriggerUpload={() => setTriggerUpload(prev => prev + 1)}
                onCancelRequest={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                  }
                }}
                fileName={activeConversation?.dashboardState?.fileName}
                isOpen={chatPanelOpen}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hotkey Settings Modal overlay */}
      <SettingsModal 
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        hotkeys={hotkeys}
        setHotkeys={setHotkeys}
      />
    </main>
  );
}

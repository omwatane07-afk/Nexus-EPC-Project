"use client";

import React from 'react';
import { Conversation } from './ChatPanel';

interface DrawerProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onClose?: () => void; // Optional callback to close the left panel when selecting a convo
  onRenameConversation?: (id: string, newTitle: string) => void;
  onDeleteConversation?: (id: string) => void;
}

export default function Drawer({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onClose,
  onRenameConversation,
  onDeleteConversation
}: DrawerProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState<string>('');
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, convoId: string } | null>(null);

  React.useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim() && onRenameConversation) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleContextMenu = (e: React.MouseEvent, convoId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      convoId
    });
  };
  return (
    <div className="w-[320px] h-full bg-[#070912] border-r border-gray-900/80 flex flex-col select-none">
      {/* Header with single Tab look matching Image 3 */}
      <div className="flex border-b border-gray-800 bg-[#04050a] px-3 pt-3 gap-1 h-14 items-end">
        <div className="px-4 py-2 text-xs font-semibold tracking-wider bg-[#070912] border-t-2 border-cyan-500 text-white rounded-t-lg flex items-center gap-1.5 cursor-default">
          <span>💬</span> Chats...
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-grow p-4 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full">
          {/* New Convo Button */}
          <button
            onClick={onNewConversation}
            className="w-full bg-cyan-600 hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] text-white text-xs font-semibold py-2.5 rounded-lg mb-4 transition-all duration-300 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
          >
            <span>+</span> New Conversation
          </button>

          {/* Conversations List */}
          <div className="flex-grow overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Recent Sessions</div>
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No past conversations.
              </div>
            ) : (
              conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => {
                    if (editingId !== convo.id) {
                      onSelectConversation(convo.id);
                      if (onClose) onClose();
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    setEditingId(convo.id);
                    setEditingTitle(convo.title);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, convo.id)}
                  className={`group w-full text-left p-3 rounded-lg text-xs transition-all border flex flex-col gap-1 cursor-pointer ${
                    activeConversationId === convo.id
                      ? 'bg-[#0c1a30] border-cyan-500/40 text-cyan-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]'
                      : 'bg-gray-950/30 border-gray-900/50 hover:bg-gray-900/30 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {editingId === convo.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleSaveRename(convo.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveRename(convo.id);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      className="bg-gray-900 border border-cyan-500 text-white text-xs font-semibold px-2 py-0.5 rounded focus:outline-none w-full"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div className="font-semibold truncate pr-2">{convo.title}</div>
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, convo.id);
                        }}
                        className="text-gray-500 hover:text-white px-1.5 rounded hover:bg-gray-800 transition-colors"
                        title="Options"
                      >
                        ⋮
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between w-full text-[10px] text-gray-500 font-mono">
                    <span>{convo.messages.length} messages</span>
                    <span>{convo.date}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Drawer Footer Banner matching Image 3 */}
      <div className="p-3 border-t border-gray-900/80 bg-[#04050a] flex justify-between items-center text-[10px] text-gray-500 font-mono">
        <span>Version 1.2.0</span>
        <span className="flex items-center gap-1">
          System Online <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        </span>
      </div>

      {/* Custom Right-Click Context Menu for Conversation Renaming & Deletion */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#070912] border border-gray-800 rounded-lg shadow-2xl py-1 w-32 text-xs text-gray-300 font-semibold"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const convo = conversations.find(c => c.id === contextMenu.convoId);
              if (convo) {
                setEditingId(convo.id);
                setEditingTitle(convo.title);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-cyan-600 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
          >
            ✏️ Rename
          </button>
          <button
            onClick={() => {
              if (onDeleteConversation) {
                onDeleteConversation(contextMenu.convoId);
              }
              setContextMenu(null);
            }}
            className="w-full text-left px-3.5 py-2 hover:bg-red-600/90 hover:text-white transition-colors flex items-center gap-2 border-t border-gray-800/80 cursor-pointer"
          >
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from 'react';

export interface HotkeyConfig {
  id: string;
  name: string;
  actionId: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  key: string;
}

export const DEFAULT_HOTKEYS: HotkeyConfig[] = [
  { id: '1', name: 'Create New Chat', actionId: 'new-chat', ctrlKey: false, altKey: true, shiftKey: false, key: 'n' },
  { id: '2', name: 'Toggle History Drawer', actionId: 'toggle-drawer', ctrlKey: true, altKey: false, shiftKey: false, key: 'h' },
  { id: '3', name: 'Upload Blueprint PDF', actionId: 'upload-blueprint', ctrlKey: false, altKey: true, shiftKey: false, key: 'u' },
  { id: '4', name: 'Trigger AI Analysis', actionId: 'trigger-analysis', ctrlKey: false, altKey: true, shiftKey: false, key: 'a' },
  { id: '5', name: 'Reset Workspace', actionId: 'reset-workspace', ctrlKey: false, altKey: true, shiftKey: false, key: 'r' },
];

export const HOTKEY_ACTIONS = [
  { id: 'new-chat', name: 'Create New Chat' },
  { id: 'toggle-drawer', name: 'Toggle History Drawer' },
  { id: 'upload-blueprint', name: 'Upload Blueprint PDF' },
  { id: 'trigger-analysis', name: 'Trigger AI Analysis' },
  { id: 'reset-workspace', name: 'Reset Workspace' },
  { id: 'show-alert', name: 'Display System Status' },
];

export function formatHotkey(hk: { ctrlKey: boolean; altKey: boolean; shiftKey: boolean; key: string }) {
  const parts: string[] = [];
  if (hk.ctrlKey) parts.push('Ctrl');
  if (hk.altKey) parts.push('Alt');
  if (hk.shiftKey) parts.push('Shift');
  if (hk.key) {
    parts.push(hk.key.toUpperCase());
  } else {
    parts.push('?');
  }
  return parts.join(' + ');
}

interface HotkeySettingsProps {
  hotkeys: HotkeyConfig[];
  setHotkeys: (hk: HotkeyConfig[]) => void;
  onClose?: () => void;
}

export default function HotkeySettings({ hotkeys, setHotkeys, onClose }: HotkeySettingsProps) {
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [addingCustom, setAddingCustom] = useState(false);
  const [newActionId, setNewActionId] = useState('new-chat');
  const [newName, setNewName] = useState('My Custom Shortcut');
  const [newKeys, setNewKeys] = useState<{ctrlKey: boolean, altKey: boolean, shiftKey: boolean, key: string}>({
    ctrlKey: false,
    altKey: true,
    shiftKey: false,
    key: 'k'
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recordingId && !addingCustom) return;

    // Prevent default system actions for hotkey binding
    if (e.key !== 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }

    const key = e.key.toLowerCase();
    
    // Ignore pure modifier presses
    if (['control', 'alt', 'shift', 'meta'].includes(key)) return;

    const keyCombo = {
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      key: key
    };

    if (key === 'escape') {
      setRecordingId(null);
      return;
    }

    // Check if combo already exists to avoid conflict
    const conflict = hotkeys.find(hk => 
      hk.ctrlKey === keyCombo.ctrlKey &&
      hk.altKey === keyCombo.altKey &&
      hk.shiftKey === keyCombo.shiftKey &&
      hk.key === keyCombo.key &&
      hk.id !== recordingId
    );

    if (conflict) {
      showToast(`Conflict: Already bound to "${conflict.name}"`);
      return;
    }

    if (recordingId) {
      setHotkeys(hotkeys.map(hk => 
        hk.id === recordingId ? { ...hk, ...keyCombo } : hk
      ));
      setRecordingId(null);
      showToast('Shortcut updated!');
    } else if (addingCustom) {
      setNewKeys(keyCombo);
    }
  }, [recordingId, addingCustom, hotkeys, setHotkeys, setNewKeys, showToast]);

  useEffect(() => {
    if (recordingId || addingCustom) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [recordingId, addingCustom, handleKeyDown]);

  const restoreDefaults = () => {
    setHotkeys(DEFAULT_HOTKEYS);
    showToast('Defaults restored!');
  };

  const addCustomHotkey = () => {
    // Generate new ID
    const newId = `custom-${Date.now()}`;
    const targetAction = HOTKEY_ACTIONS.find(a => a.id === newActionId);
    
    const newHotkey: HotkeyConfig = {
      id: newId,
      name: newName || (targetAction ? targetAction.name : 'Custom Action'),
      actionId: newActionId,
      ...newKeys
    };

    setHotkeys([...hotkeys, newHotkey]);
    setAddingCustom(false);
    showToast('Custom shortcut added!');
  };

  const deleteHotkey = (id: string) => {
    setHotkeys(hotkeys.filter(hk => hk.id !== id));
    showToast('Shortcut deleted.');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0c16] text-gray-200">
      {/* Toast Notification inside settings */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0d2b45] border border-cyan-500 text-cyan-300 px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] text-sm animate-pulse">
          {toastMessage}
        </div>
      )}

      <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-800">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-wide">Hotkey Configuration</h3>
          <p className="text-xs text-gray-400 mt-1">Bind custom combinations to perform quick actions</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white p-1 hover:bg-gray-800/50 rounded-lg transition-all"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main configuration body */}
      <div className="flex-grow overflow-y-auto space-y-4 pr-1 pb-6">
        <div className="space-y-2">
          {hotkeys.map(hk => (
            <div 
              key={hk.id} 
              className="flex justify-between items-center p-3 rounded-lg border border-gray-800/80 bg-gray-950/40 hover:bg-gray-900/30 transition-all group"
            >
              <div>
                <div className="text-sm font-medium text-white">{hk.name}</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5 opacity-80">
                  Action: {HOTKEY_ACTIONS.find(a => a.id === hk.actionId)?.name || hk.actionId}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRecordingId(recordingId === hk.id ? null : hk.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border font-semibold tracking-wider transition-all min-w-[120px] text-center ${
                    recordingId === hk.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)] animate-pulse'
                      : 'bg-gray-900 border-gray-700 text-gray-300 group-hover:border-gray-600 hover:bg-gray-800'
                  }`}
                >
                  {recordingId === hk.id ? 'PRESS KEYS...' : formatHotkey(hk)}
                </button>

                {/* Allow deletion for custom hotkeys */}
                {hk.id.startsWith('custom-') && (
                  <button 
                    onClick={() => deleteHotkey(hk.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/20 p-1.5 rounded transition-all"
                    title="Delete custom hotkey"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add custom hotkey section */}
        {addingCustom ? (
          <div className="p-4 border border-cyan-800/50 rounded-xl bg-cyan-950/10 space-y-3">
            <h4 className="text-sm font-semibold text-cyan-400">Add New Shortcut</h4>
            
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Shortcut Name</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Trigger Action</label>
                <select 
                  value={newActionId} 
                  onChange={(e) => setNewActionId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {HOTKEY_ACTIONS.map(act => (
                    <option key={act.id} value={act.id}>{act.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Shortcut Keys</label>
                <button
                  type="button"
                  onClick={() => {}}
                  className="w-full text-left bg-gray-900 border border-gray-800 rounded px-2.5 py-2 text-sm text-cyan-300 font-mono animate-pulse border-cyan-500/50"
                >
                  Press key combo: <span className="font-bold underline">{formatHotkey(newKeys)}</span>
                </button>
                <span className="text-[10px] text-gray-400 mt-1 block">Click the field and press any keyboard combination.</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => setAddingCustom(false)} 
                className="px-3 py-1.5 rounded text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={addCustomHotkey} 
                className="px-3 py-1.5 rounded text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-[0_0_10px_rgba(6,182,212,0.3)]"
              >
                Save Shortcut
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingCustom(true)}
            className="w-full border border-dashed border-gray-800 hover:border-cyan-800 hover:bg-cyan-950/5 text-xs text-gray-400 hover:text-cyan-300 py-3 rounded-lg font-medium transition-all"
          >
            + Add Custom Shortcut
          </button>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-850">
        <button 
          onClick={restoreDefaults}
          className="text-xs text-gray-400 hover:text-white underline transition-all"
        >
          Restore Defaults
        </button>
        
        {recordingId && (
          <span className="text-xs text-cyan-400 font-medium animate-pulse">
            Press keys to assign... (Esc to cancel)
          </span>
        )}
      </div>
    </div>
  );
}

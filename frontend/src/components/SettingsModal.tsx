"use client";

import React, { useEffect } from 'react';
import HotkeySettings, { HotkeyConfig } from './HotkeySettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotkeys: HotkeyConfig[];
  setHotkeys: (hk: HotkeyConfig[]) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  hotkeys,
  setHotkeys
}: SettingsModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Glassmorphic backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[4px] transition-opacity duration-300 animate-fade-in"
      />
      
      {/* Modal Content container */}
      <div className="relative w-full max-w-lg bg-[#070912]/90 border border-gray-800/80 rounded-2xl p-6 shadow-[0_10px_50px_rgba(0,0,0,0.8)] z-10 transition-transform duration-300 animate-zoom-in overflow-hidden glass-panel max-h-[90vh] flex flex-col">
        {/* Subtle decorative glow line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500" />
        
        {/* User Profile Card */}
        <div className="mb-5 p-4 rounded-xl bg-gray-950/60 border border-gray-800/40 flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-full border border-cyan-500/80 flex items-center justify-center bg-[#101424] text-cyan-300 font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.25)] overflow-hidden">
            {/* Fallback to default styling if avatar fails */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/avatar.jpg"
              alt="User profile"
              className="w-full h-full object-cover rounded-full z-10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="absolute z-0 font-bold text-sm tracking-wide text-cyan-400">N</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide">Nexus Project Manager</h4>
            <p className="text-xs text-gray-400 mt-0.5">Role: Data Centre EPC Delivery Coordinator</p>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-green-400 bg-green-950/30 border border-green-800/40 px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wider">
              <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></span>
              Active Session
            </span>
          </div>
        </div>

        {/* Render HotkeySettings inside modal */}
        <div className="flex-grow overflow-y-auto">
          <HotkeySettings 
            hotkeys={hotkeys}
            setHotkeys={setHotkeys}
            onClose={onClose}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.25s ease-out forwards;
        }
        .animate-zoom-in {
          animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

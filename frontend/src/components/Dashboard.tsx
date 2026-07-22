"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { DashboardState } from './ChatPanel';

interface Clash {
  type: string;
  nodes: string[];
  description: string;
  severity: string;
}

interface Mitigation {
  clash_id: string;
  moving_node: string;
  node_dimension?: string | null;
  suggested_reroute: { x: number, y: number, z?: number, w: number, h: number, unit?: string };
  mitigation_strategy: string;
  message: string;
}

interface DashboardProps {
  triggerUpload?: number;
  triggerAnalysis?: number;
  onAnalysisSuccess?: (fileName: string) => void;
  dashboardState?: DashboardState;
  onStateChange?: (state: DashboardState) => void;
}

export default function Dashboard({
  triggerUpload = 0,
  triggerAnalysis = 0,
  onAnalysisSuccess,
  dashboardState,
  onStateChange
}: DashboardProps) {
  const [loading, setLoading] = useState(false);
  
  const { fileName, analyzed, clashes, mitigations, nodes, edges } = dashboardState || {
    fileName: null, analyzed: false, clashes: [], mitigations: [], nodes: [], edges: []
  };

  // File Upload State (local only for the upload process)
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!dashboardState || !dashboardState.fileName) {
      setFile(null);
    }
  }, [dashboardState?.fileName]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setToastError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf' && !droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setToastError("Please upload a valid PDF blueprint.");
        return;
      }
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToastError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setToastError("Please upload a valid PDF blueprint.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!file) {
      setToastError("Please select or drop a blueprint file first.");
      return;
    }
    
    setLoading(true);
    setToastError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      
      const res = await fetch(`${backendUrl}/api/v1/blueprints/upload`, {
        method: 'POST',
        // Do NOT manually set Content-Type header when using FormData. 
        // The browser will automatically set the boundary.
        body: formData
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (onStateChange) {
        onStateChange({
          fileName: file.name,
          analyzed: true,
          clashes: data.clashes,
          mitigations: data.mitigations,
          nodes: [
            { id: 'LC-101', position: { x: 100, y: 200 }, data: { label: 'LC-101 (Liquid Cooling)' }, style: { background: '#1e3a8a', color: '#fff', border: '2px solid #3b82f6', width: 150 } },
            { id: 'HV-202', position: { x: 50, y: 400 }, data: { label: 'HV-202 (480V Tray)' }, style: { background: '#7f1d1d', color: '#fff', border: '2px solid #ef4444', width: 200 } },
            { id: 'SRV-300KW', position: { x: 120, y: 750 }, data: { label: 'DGX SuperPOD Rack' }, style: { background: '#064e3b', color: '#fff', border: '2px solid #10b981', width: 180 } }
          ],
          edges: [{
            id: 'e1', source: 'LC-101', target: 'HV-202', animated: true,
            style: { stroke: '#ef4444', strokeWidth: 3 },
            label: 'CRITICAL CLASH', labelStyle: { fill: '#ef4444', fontWeight: 700 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' }
          }]
        });
      }
      
      if (onAnalysisSuccess) {
        onAnalysisSuccess(file.name);
      }
    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected network error occurred.";
      setToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (triggerUpload > 0) {
      triggerFileInput();
    }
  }, [triggerUpload]);

  useEffect(() => {
    if (triggerAnalysis > 0) {
      if (file) {
        setTimeout(() => {
          handleUpload();
        }, 0);
      } else {
        setTimeout(() => {
          setToastError("Please select or drop a blueprint file first.");
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAnalysis]);

  const acceptMitigation = (mitigation: Mitigation) => {
    if (onStateChange) {
      const updatedNodes = nodes.map(node => {
        if (node.id === mitigation.moving_node) {
          return {
            ...node,
            position: { x: mitigation.suggested_reroute.x, y: mitigation.suggested_reroute.y },
            style: { ...node.style, background: '#14532d', border: '2px solid #22c55e' }
          };
        }
        return node;
      });
      onStateChange({
        ...dashboardState!,
        nodes: updatedNodes,
        edges: [],
        clashes: []
      });
    }
  };

  const handleDownloadReport = async () => {
    if (!dashboardState || !analyzed) return;
    setIsDownloading(true);
    setToastError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/report/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dashboardState)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "MEP_Resolution_Report.pdf";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error(error);
      setToastError(error.message || "Failed to download the detailed report.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full h-full relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Toast Error Alert */}
      {toastError && (
        <div className="fixed top-20 right-8 z-[60] bg-red-900 border border-red-500 text-white px-6 py-4 rounded shadow-2xl animate-bounce">
          <strong>Error: </strong> {toastError}
          <button onClick={() => setToastError(null)} className="ml-4 font-bold text-red-200 hover:text-white">X</button>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-[#0a0f1d]/85 flex justify-between items-center z-10">
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Spatial Knowledge Graph</h3>
      </div>

      {/* Center Content */}
      <div className="flex-grow bg-[#0a0a0a] relative overflow-hidden flex flex-col justify-center">
        {loading ? (
          /* Immersive Full-Screen scanning animation on the screen */
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-8 relative overflow-hidden bg-gray-950/80">
            {/* Laser scan lines */}
            <div className="absolute left-0 right-0 h-[3px] bg-cyan-500 shadow-[0_0_15px_#06b6d4] opacity-80 animate-laser-scan pointer-events-none" />
            
            {/* Glassmorphic Loader Details */}
            <div className="z-10 flex flex-col items-center text-center space-y-4 w-full max-w-xs p-6 bg-gray-905/60 border border-gray-800/80 rounded-2xl backdrop-blur-md shadow-2xl">
              <div className="relative w-14 h-14 flex items-center justify-center bg-cyan-950/30 border border-cyan-800/40 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                <span className="absolute inset-0 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                <span className="text-cyan-400 text-xl font-bold">⚡</span>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Nexus Spatial AI Engine</h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">Analyzing MEP pipeline configurations & spatial layout clearances...</p>
              </div>
              {/* Fake progress bar */}
              <div className="w-full h-1.5 bg-gray-950 rounded-full overflow-hidden border border-gray-900">
                <div className="h-full bg-cyan-500 rounded-full animate-progress-load shadow-[0_0_8px_#06b6d4]" />
              </div>
              <div className="text-[9px] text-gray-500 font-mono flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse animate-ping"></span>
                Scanning coordinates... [HV-202 Clashes]
              </div>
            </div>
          </div>
        ) : analyzed ? (
          <ReactFlow nodes={nodes} edges={edges} fitView className="dark-theme">
            <Background color="#333" gap={16} />
            <Controls className="bg-gray-800 border-gray-700 fill-white" />
          </ReactFlow>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 relative">
            {file || fileName ? (
              /* Selected File Card */
              <div className="w-full max-w-sm p-6 border border-gray-800/60 bg-gray-900/30 rounded-2xl flex flex-col items-center text-center space-y-4 shadow-xl">
                <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white truncate max-w-xs">{file ? file.name : fileName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{file ? (file.size / 1024 / 1024).toFixed(2) : "Unknown"} MB • PDF Blueprint</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/20 border border-blue-800/40 text-[10px] text-blue-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  Ready for Spatial Analysis
                </span>
              </div>
            ) : (
              /* Drag & Drop zone */
              <div 
                className={`w-full max-w-md border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                />
                <svg className="w-16 h-16 mb-4 text-gray-400 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-center text-gray-400 text-sm">Drag & drop a blueprint PDF here, or click to select</p>
              </div>
            )}

            {/* Bottom Control Bar */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-[#0a0f1d]/90 border border-gray-800/80 rounded-full px-4 py-2 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.6)] z-20">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
              />
              
              {/* 1st Option: Upload icon button (no text) */}
              <button
                type="button"
                onClick={triggerFileInput}
                className="w-9 h-9 rounded-full bg-gray-955 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-600 transition-all cursor-pointer focus:outline-none"
                title="Upload blueprint PDF"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {/* 2nd Option: Analyze Blueprint button */}
              {file && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full font-medium text-xs transition-all shadow-[0_0_15px_rgba(37,99,235,0.45)] hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] cursor-pointer focus:outline-none animate-fade-in"
                >
                  Analyze Blueprint
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Slide-In Alerts Overlay Panel */}
      {clashes.length > 0 && (
        <div className="absolute top-16 right-4 bottom-16 w-80 bg-[#070912]/95 border border-gray-800/85 rounded-2xl p-5 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.75)] z-20 overflow-y-auto flex flex-col gap-4 animate-slide-in-right custom-scrollbar">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h4 className="text-red-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Critical Alerts
            </h4>
            <span className="text-[9px] text-gray-400 font-mono bg-red-950/40 border border-red-900/30 px-2 py-0.5 rounded">{clashes.length} Clashes</span>
          </div>
          {clashes.map((clash, idx) => (
            <div key={idx} className="bg-red-950/10 border border-red-900/30 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-medium text-xs">{clash.type}</h3>
              <p className="text-gray-400 text-[11px] leading-relaxed">{clash.description}</p>
              
              {mitigations.filter(m => m.clash_id === clash.nodes.join('-')).map(mitigation => (
                <div key={mitigation.clash_id} className="bg-gray-900/90 rounded-lg p-3 border border-gray-850/50 space-y-2">
                  <h5 className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider">AI Reroute Suggested</h5>
                  <p className="text-[11px] text-gray-300 leading-relaxed">{mitigation.message}</p>
                  <span className="inline-block px-2 py-0.5 bg-gray-800 text-gray-400 text-[9px] font-mono rounded border border-gray-700/50">
                    Size: {mitigation.node_dimension ?? "Standard Dimension"}
                  </span>
                  <button 
                    onClick={() => acceptMitigation(mitigation)} 
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer focus:outline-none"
                  >
                    Accept Reroute
                  </button>
                </div>
              ))}
            </div>
          ))}

          <div className="mt-auto pt-4 border-t border-gray-800">
            <button
              onClick={handleDownloadReport}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white py-2 rounded-lg text-[11px] font-semibold transition-all shadow-[0_0_10px_rgba(255,255,255,0.05)] cursor-pointer focus:outline-none"
            >
              {isDownloading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Detailed Report
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes laserScan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes progressLoad {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-laser-scan {
          animation: laserScan 4.5s linear infinite;
        }
        .animate-progress-load {
          animation: progressLoad 8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

"use client";

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  onClick?: () => void;
  hoverGlow?: boolean;
}

export default function Logo({
  className = "",
  size = 48,
  onClick,
  hoverGlow = true
}: LogoProps) {
  // We draw 8 identical overlapping arms, each rotated by i * 45 degrees.
  // Using path coordinates centered at 50, 50.
  // One arm starts on the outer top-left, goes to top-right, bends inwards,
  // and is clipped/layered to form a continuous interlocking pattern.
  const arms = Array.from({ length: 8 });

  // Single arm SVG path definition:
  // Starts at top-left edge of octagon, goes to top-right corner,
  // turns 45 degrees along top-right side, then bends inwards.
  // The path thickness is 9.5px, with spacing gaps.
  const armPath = "M 34.5 16 L 65.5 16 L 77.5 28 L 68 37.5 L 61 30.5 L 39.5 30.5 L 30 40 L 20.5 30.5 Z";

  return (
    <div 
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative select-none cursor-pointer flex items-center justify-center transition-all duration-300 ${
        onClick ? 'active:scale-90' : ''
      } ${className}`}
      title="Toggle Left Panel"
    >
      {/* Glow effect backdrop */}
      {hoverGlow && (
        <div className="absolute inset-0 rounded-full bg-[#ff5b1a]/20 blur-md opacity-0 hover:opacity-100 transition-opacity duration-500 scale-110 pointer-events-none" />
      )}
      
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="transform transition-transform duration-700 hover:rotate-45"
      >
        <defs>
          {/* Main orange-to-red gradient for premium tech feel */}
          <linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff7b39" />
            <stop offset="60%" stopColor="#ff4d00" />
            <stop offset="100%" stopColor="#d83a00" />
          </linearGradient>
          
          {/* Shadow filter to give an overlapping ribbon appearance */}
          <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="-0.8" dy="1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Outer subtle guide ring */}
        <circle cx="50" cy="50" r="46" stroke="#ff5b1a" strokeWidth="0.5" strokeDasharray="3 3" className="opacity-20" />

        {/* Arms list */}
        {arms.map((_, idx) => (
          <path
            key={idx}
            d={armPath}
            fill="url(#orange-grad)"
            stroke="#05060b" /* Match dashboard background to create separation gaps */
            strokeWidth="2.5"
            strokeLinejoin="miter"
            filter="url(#shadow)"
            transform={`rotate(${idx * 45} 50 50)`}
            className="transition-all duration-300"
          />
        ))}

        {/* Render a segment of the first arm again to make it interlock over the 8th arm */}
        <path
          d="M 34.5 16 L 47 16"
          stroke="url(#orange-grad)"
          strokeWidth="9.5"
          strokeLinecap="square"
          filter="url(#shadow)"
          transform="rotate(0 50 50)"
          className="pointer-events-none"
        />
        <path
          d="M 34.5 16 L 47 16"
          stroke="#05060b"
          strokeWidth="2.5"
          transform="rotate(0 50 50)"
          className="pointer-events-none opacity-40"
        />
      </svg>
    </div>
  );
}

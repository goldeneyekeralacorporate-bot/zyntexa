import React from 'react';

interface Logo3DProps {
  className?: string;
}

export default function Logo3D({ className = '' }: Logo3DProps) {
  return (
    <div
      className={`select-none flex flex-col items-center justify-center cursor-pointer py-1 px-1 transition-all duration-300 ${className}`}
    >
      {/* Sleek, enlarged 2D SVG Logo Badge */}
      <div
        className="relative w-14 h-14 flex items-center justify-center transition-all duration-300 hover:scale-105"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-12 h-12 select-none animate-pulse-subtle"
        >
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          
          {/* Basket Handle */}
          <path 
            d="M 49 34 A 6 6 0 0 1 61 34" 
            fill="none" 
            stroke="url(#logo-gradient)" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
          />
          
          {/* Top Bar */}
          <path 
            d="M 42 34 L 68 34" 
            fill="none" 
            stroke="url(#logo-gradient)" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
          />
          
          {/* Z-Diagonal and Bottom Bar */}
          <path 
            d="M 68 34 L 40 56 L 68 56" 
            fill="none" 
            stroke="url(#logo-gradient)" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Continuous W-path (handle + cart diagonals + arrow shaft) */}
          <path 
            d="M 22 28 L 30 28 L 40 56 L 54 34 L 64 56 L 78 29" 
            fill="none" 
            stroke="url(#logo-gradient)" 
            strokeWidth="4.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Arrow Head */}
          <polygon 
            points="84,18 68,28 82,33" 
            fill="url(#logo-gradient)" 
          />
          
          {/* Wheels */}
          <circle cx="40" cy="65" r="4.5" fill="url(#logo-gradient)" />
          <circle cx="64" cy="65" r="4.5" fill="url(#logo-gradient)" />
        </svg>
      </div>

      {/* Brand Name on downside */}
      <div className="-mt-1 flex items-center justify-center">
        <span className="font-sans font-black text-[10px] tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-500 hover:opacity-90 transition-opacity duration-300">
          ZYNTEXA
        </span>
      </div>
    </div>
  );
}


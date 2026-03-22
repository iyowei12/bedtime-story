import React from 'react';

export function Moon({ size = 68 }) {
  return (
    <div className="moon-anim">
      <svg width={size} height={size} viewBox="0 0 68 68">
        <defs>
          <radialGradient id="mg" cx="36%" cy="32%">
            <stop offset="0%" stopColor="#fff8cc" />
            <stop offset="55%" stopColor="#f0c55a" />
            <stop offset="100%" stopColor="#c87830" />
          </radialGradient>
        </defs>
        <circle cx="34" cy="34" r="26" fill="url(#mg)" />
        <circle cx="44" cy="25" r="20" fill="#0a1628" />
        <circle cx="19" cy="40" r="4" fill="rgba(0,0,0,.13)" />
        <circle cx="27" cy="28" r="2.5" fill="rgba(0,0,0,.10)" />
        <circle cx="13" cy="32" r="1.8" fill="rgba(0,0,0,.08)" />
      </svg>
    </div>
  );
}

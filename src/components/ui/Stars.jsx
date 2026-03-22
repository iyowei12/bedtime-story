import React, { useRef } from 'react';

export function Stars() {
  const items = useRef(
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      top: Math.random() * 100, left: Math.random() * 100,
      size: Math.random() * 2.4 + .4,
      dur: Math.random() * 3 + 2.2, del: Math.random() * 6,
    }))
  ).current;
  
  return (
    <div className="star-layer">
      {items.map(s => (
        <div key={s.id} className="star" style={{
          top: `${s.top}%`, left: `${s.left}%`,
          width: s.size, height: s.size,
          animation: `twinkle ${s.dur}s ${s.del}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

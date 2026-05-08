const starAt = (i: number) => {
  const seed = i + 1;
  const frac = (n: number) => n - Math.floor(n);
  const mix = (a: number, b: number) => frac(Math.sin(seed * a + b) * 10000);

  return {
    id: i,
    top: mix(12.9898, 78.233) * 100,
    left: mix(39.3467, 11.135) * 100,
    size: mix(73.156, 52.235) * 2.4 + 0.4,
    dur: mix(19.417, 23.871) * 3 + 2.2,
    del: mix(61.271, 7.913) * 6,
  };
};

export function Stars() {
  const items = Array.from({ length: 60 }, (_, i) => starAt(i));
  
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

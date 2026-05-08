interface MoonProps {
  size?: number;
}

export function Moon({ size = 76 }: MoonProps) {
  return (
    <div className="moon-anim">
      <svg width={size} height={size} viewBox="0 0 68 68">
        <defs>
          <radialGradient id="mg" cx="36%" cy="32%">
            <stop offset="0%" stopColor="#fff8cc"></stop>
            <stop offset="55%" stopColor="#f0c55a"></stop>
            <stop offset="100%" stopColor="#c87830"></stop>
          </radialGradient>
        </defs>
        <circle cx="34" cy="34" r="26" fill="url(#mg)"></circle>
        <circle cx="44" cy="25" r="20" fill="#0a1628"></circle>
        <circle cx="19" cy="40" r="4" fill="rgba(0,0,0,.13)"></circle>
        <circle cx="27" cy="28" r="2.5" fill="rgba(0,0,0,.10)"></circle>
        <circle cx="13" cy="32" r="1.8" fill="rgba(0,0,0,.08)"></circle>
      </svg>
    </div>
  );
}

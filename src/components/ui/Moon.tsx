interface MoonProps {
  size?: number;
}

export function Moon({ size = 70 }: MoonProps) {
  return (
    <div className="moon" style={{ width: size, height: size }}>
      <div className="crater" style={{ top: '25%', left: '30%', width: '15%', height: '15%' }} />
      <div className="crater" style={{ top: '55%', left: '20%', width: '22%', height: '22%' }} />
      <div className="crater" style={{ top: '40%', left: '60%', width: '18%', height: '18%' }} />
    </div>
  );
}

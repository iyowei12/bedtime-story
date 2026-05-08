import { useState, useEffect } from 'react';
import { Moon } from '../ui/Moon';
import { T } from '../../locales/translations';
import { Language } from '../../types';

interface LoadingPageProps {
  lang: Language;
}

export function LoadingPage({ lang }: LoadingPageProps) {
  const t = T[lang];
  const msgs = [t.g1, t.g2, t.g3, t.g4];
  const [idx, setIdx] = useState(0);
  
  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % msgs.length), 2100);
    return () => clearInterval(id);
  }, [msgs.length]);
  
  return (
    <div className="page" style={{ paddingTop: 0, minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 34 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 110 + i * 16, height: 110 + i * 16,
            marginTop: -(55 + i * 8), marginLeft: -(55 + i * 8),
            animation: `orbit ${3.8 + i * 1.3}s linear ${i % 2 ? 'reverse' : ''} infinite`,
          }}>
            <div style={{
              position: 'absolute',
              top: i % 2 ? 'auto' : '0', bottom: i % 2 ? '0' : 'auto',
              left: '50%', transform: 'translateX(-50%)',
              fontSize: 10 + i * 2.5, opacity: .45 + i * .11,
            }}>⭐</div>
          </div>
        ))}
        <Moon size={76} />
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color: '#e2b96f', textAlign: 'center', minHeight: 28 }}>{msgs[idx]}</p>
    </div>
  );
}

import React, { useRef } from 'react';
import { Moon } from '../ui/Moon';
import { T } from '../../locales/translations';

export function HomePage({
  lang, setLang,
  imgs, setImgs,
  len, setLen,
  cfg, error,
  onGenerate, setPage
}) {
  const t = T[lang];
  const camRef = useRef();
  const galRef = useRef();
  
  const displayHero = lang === 'zh' ? cfg.childName : (cfg.childNameEn || cfg.childName);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f || imgs.length >= 3) return;
    const r = new FileReader();
    r.onload = ev => {
      const im = new Image();
      im.onload = () => {
        const MAX = 1200;
        const ratio = Math.min(MAX / im.width, MAX / im.height, 1);
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * ratio);
        c.height = Math.round(im.height * ratio);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        const newImg = c.toDataURL('image/jpeg', .85);
        setImgs([...imgs, newImg].slice(0, 3));
      };
      im.src = ev.target.result;
    };
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const removeImg = (idx) => {
    setImgs(imgs.filter((_, i) => i !== idx));
  };

  return (
    <div className="page" style={{ paddingTop: 38 }}>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
      <input ref={galRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <Moon size={76} />
        <h1 style={{
          fontSize: 33, fontWeight: 900, marginTop: 8, marginBottom: 6,
          background: 'linear-gradient(130deg, #f8d870, #e09040)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-.5px',
        }}>{t.appTitle}</h1>
        <p style={{ fontSize: 13.5, color: '#5a80b8', fontWeight: 600 }}>{t.appSub}</p>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setPage('library')}>{t.library}</button>
          <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setPage('settings')}>{t.settings}</button>
        </div>
        <button className="btn-ghost" style={{ fontSize: 13, fontWeight: 800 }} onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}>
          {lang === 'zh' ? '🇬🇧 EN' : '🇹🇼 中文'}
        </button>
      </div>

      {/* Photo area */}
      <div className="card" style={{ padding: 18, marginBottom: 14 }}>
        {imgs.length > 0 ? (
          <>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 16, paddingBottom: 8 }}>
              {imgs.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={src} alt={`storybook-${idx}`}
                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 12, border: '2px solid rgba(226, 185, 111, 0.3)' }} />
                  <button 
                    onClick={() => removeImg(idx)}
                    style={{ 
                      position: 'absolute', top: -6, right: -6, 
                      background: '#ff6b6b', color: '#fff', border: 'none', 
                      borderRadius: '50%', width: 24, height: 24, 
                      fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                    }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            {imgs.length < 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button className="btn-gold" style={{ fontSize: 14 }} onClick={() => camRef.current?.click()}>{t.takePhoto}</button>
                <button className="btn-ghost" style={{ fontSize: 14 }} onClick={() => galRef.current?.click()}>{t.choosePhoto}</button>
              </div>
            )}
            {imgs.length >= 3 && (
              <div style={{ fontSize: 12, color: '#a8b8d5', textAlign: 'center' }}>
                {lang === 'zh' ? '已達到最大圖片數量限制 (3張)' : 'Max image limit reached (3 photos)'}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 46, marginBottom: 11 }}>📖</div>
            <p style={{ fontSize: 14, color: '#5a80b8', marginBottom: 17, fontWeight: 600 }}>
              {lang === 'zh' ? '拍下故事書的照片 (最多3張)' : 'Take photos of your storybook (max 3)'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn-gold" style={{ fontSize: 14 }} onClick={() => camRef.current?.click()}>{t.takePhoto}</button>
              <button className="btn-ghost" style={{ fontSize: 14 }} onClick={() => galRef.current?.click()}>{t.choosePhoto}</button>
            </div>
          </div>
        )}
      </div>

      {/* Story length */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <span className="label">⏱ {t.lenLabel}</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          {[['1', t.min1], ['3', t.min3], ['5', t.min5]].map(([v, l]) => (
            <button key={v} className={`len-btn ${len === v ? 'len-active' : 'len-inactive'}`}
              onClick={() => setLen(v)}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="error">❌ {error}</div>}

      <button className="btn-gold" disabled={imgs.length === 0} onClick={onGenerate}>{t.generate}</button>

      {displayHero && (
        <p style={{ textAlign: 'center', fontSize: 13, color: '#5a80b8', marginTop: 11, fontWeight: 600 }}>
          {t.heroHint(displayHero)}
        </p>
      )}
    </div>
  );
}

import React from 'react';
import { Moon } from '../ui/Moon';
import { T } from '../../locales/translations';

export function LibraryPage({ stories, gToken, isSyncing, onSync, onSelect, onDelete, onBack, lang }) {
  const t = T[lang];
  return (
    <div className="page" style={{ paddingTop: 38 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <button className="btn-ghost" onClick={onBack}>{t.back}</button>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2b96f' }}>{t.libTitle}</h2>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#7a90b8', background: 'rgba(255,255,255,.08)', padding: '3px 11px', borderRadius: 20, fontWeight: 700 }}>
          {stories.length}
        </span>
      </div>

      <div className="card" style={{ padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: '#a8b8d5' }}>
          ☁️ {lang === 'zh' ? 'Google 雲端備份' : 'Google Drive Sync'}
        </div>
        {!gToken ? (
          <button className="btn-ghost-sm" style={{ margin: 0 }} onClick={() => onSync(true)}>
            {lang === 'zh' ? '授權登入' : 'Login'}
          </button>
        ) : (
          <button className="btn-ghost-sm" style={{ margin: 0, color: isSyncing ? '#e2b96f' : '#6fcf97' }} disabled={isSyncing} onClick={() => onSync(true)}>
            {isSyncing ? (lang === 'zh' ? '🔄 同步中...' : 'Syncing...') : (lang === 'zh' ? '✅ 已連線 (按我同步)' : '✅ Synced')}
          </button>
        )}
      </div>

      {stories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', opacity: .5 }}>
          <Moon size={58} />
          <p style={{ marginTop: 18, lineHeight: 1.85, whiteSpace: 'pre-line', fontSize: 15 }}>{t.libEmpty}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {stories.map((s, i) => (
            <div key={s.id} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: '#5a78a8', marginBottom: 5, fontWeight: 700 }}>
                    {t.storyN(stories.length - i)} · {new Date(s.date).toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US')}
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#a8b8d5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {s.text}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                  <button className="btn-gold-sm" onClick={() => onSelect(s.text)}>{t.read}</button>
                  <button className="btn-ghost-sm" onClick={() => onDelete(s.id)}>{t.del}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

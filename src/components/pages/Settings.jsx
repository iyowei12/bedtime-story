import React, { useEffect, useState } from 'react';
import { T } from '../../locales/translations';
import { bgm } from '../../services/bgm';

export function SettingsPage({ cfg, onSave, gToken, isSyncing, onSync, lang, deferredPrompt, setDeferredPrompt }) {
  const t = T[lang];
  const [v, setV] = useState(cfg);
  const [showAi, setShowAi] = useState(false);
  const [showTts, setShowTts] = useState(false);
  const [browserVoices, setBrowserVoices] = useState([]);
  const [isPreviewingBgm, setIsPreviewingBgm] = useState(false);

  useEffect(() => {
    setV(cfg);
  }, [cfg]);

  useEffect(() => {
    return () => {
      bgm.pause();
    };
  }, []);
  
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const ai = [
    { k: 'claude', l: 'Claude (Anthropic)', n: t.notes.claude },
    { k: 'gemini', l: 'Gemini (Google)', n: t.notes.gemini },
    { k: 'openai', l: 'ChatGPT (OpenAI)', n: t.notes.openai },
  ];
  
  const tts = [
    { k: 'browser', l: lang === 'zh' ? '瀏覽器內建（免費）' : 'Browser Built-in (Free)', n: t.notes.browser },
    { k: 'elevenlabs', l: 'ElevenLabs', n: t.notes.elevenlabs },
    { k: 'openai', l: 'OpenAI TTS', n: t.notes.openaiTts },
    { k: 'google', l: 'Google Cloud TTS', n: t.notes.google },
  ];
  
  const aiObj = ai.find(x => x.k === v.aiProvider) || ai[0];
  const aiNote = aiObj.n;
  const aiUrl = t.urls[aiObj.k];
  const activeAiKey = v.aiKeys?.[v.aiProvider] || '';
  
  const ttsObj = tts.find(x => x.k === v.ttsProvider) || tts[0];
  const ttsNote = ttsObj.n;
  const ttsUrl = t.urls[ttsObj.k];
  const activeTtsKey = v.ttsKeys?.[v.ttsProvider] || '';

  const updateAiKey = (value) => {
    setV({
      ...v,
      aiKey: v.aiProvider === 'openai' ? value : v.aiKey,
      aiKeys: {
        ...(v.aiKeys || {}),
        [v.aiProvider]: value
      }
    });
  };

  const updateTtsKey = (value) => {
    setV({
      ...v,
      ttsKey: v.ttsProvider === 'browser' ? v.ttsKey : value,
      ttsKeys: {
        ...(v.ttsKeys || {}),
        [v.ttsProvider]: value
      }
    });
  };

  useEffect(() => {
    if (!window.speechSynthesis) return;

    const syncVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setBrowserVoices([...voices].sort((a, b) => {
        const langDiff = a.lang.localeCompare(b.lang);
        return langDiff || a.name.localeCompare(b.name);
      }));
    };

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    return () => {
      if (window.speechSynthesis.onvoiceschanged === syncVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);
  
  return (
    <div className="page" style={{ paddingTop: 38 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button className="btn-ghost" onClick={() => {
          let newV = { ...v };
          if (newV.childName?.trim() || newV.childNameEn?.trim()) {
            let h = newV.nameHistory || [];
            const zh = (newV.childName || '').trim();
            const en = (newV.childNameEn || '').trim();
            h = h.filter(p => p.zh !== zh || p.en !== en);
            h = [{ zh, en }, ...h].slice(0, 5);
            newV.nameHistory = h;
          }
          delete newV.childNameHistory;
          delete newV.childNameEnHistory;
          onSave(newV);
        }}>{t.back}</button>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2b96f' }}>{t.setTitle}</h2>
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
            {isSyncing ? (lang === 'zh' ? '🔄 同步中...' : 'Syncing...') : (lang === 'zh' ? '✅ 已連線 (立刻同步)' : '✅ Synced (Sync now)')}
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 13 }}>
        {v.nameHistory && v.nameHistory.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <span className="label">🧸 {lang === 'zh' ? '常用主角' : 'Recent Profiles'}</span>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
              {v.nameHistory.map((profile, i) => {
                const isActive = v.childName === profile.zh && v.childNameEn === profile.en;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: isActive ? 'rgba(226, 185, 111, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isActive ? '#e2b96f' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: 16, padding: '6px 4px 6px 14px',
                      boxShadow: isActive ? '0 0 10px rgba(226, 185, 111, 0.2)' : 'none'
                    }}
                  >
                    <div
                      onClick={() => setV({ ...v, childName: profile.zh, childNameEn: profile.en })}
                      style={{ flex: 1, cursor: 'pointer', padding: '4px 0' }}
                    >
                      <div style={{ fontSize: 16, color: isActive ? '#e2b96f' : '#eef4ff', fontWeight: 800 }}>{profile.zh || '-'}</div>
                      <div style={{ fontSize: 13, color: '#a8b8d5', marginTop: 3 }}>{profile.en || '-'}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setV({ ...v, nameHistory: v.nameHistory.filter((_, idx) => idx !== i) });
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#ff6b6b',
                        padding: '10px 14px', fontSize: 20, cursor: 'pointer', opacity: 0.8
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <span className="label">👶 {t.cName}</span>
          <input className="field" value={v.childName || ''} onChange={e => setV({ ...v, childName: e.target.value })} placeholder={t.cPH} />
        </div>
        <div>
          <span className="label">🦄 {t.cNameEn}</span>
          <input className="field" value={v.childNameEn || ''} onChange={e => setV({ ...v, childNameEn: e.target.value })} placeholder={t.cNameEnPH} />
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 13 }}>
        <span className="label">🎵 {t.bgmTitle}</span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: '#eef4ff' }}>{t.bgmEnabled}</span>
          <input type="checkbox" checked={v.bgmEnabled !== false} onChange={e => setV({ ...v, bgmEnabled: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#e2b96f' }} />
        </div>
        {v.bgmEnabled !== false && (
          <>
            <select className="field" value={v.bgmType || 'musicbox'} onChange={e => { setV({ ...v, bgmType: e.target.value }); if (isPreviewingBgm) bgm.play(e.target.value, v.bgmVolume ?? 0.15); }} style={{ marginBottom: 12 }}>
              {Object.entries(t.bgmTypes).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#5a80b8', width: 40, whiteSpace: 'nowrap' }}>{t.bgmVolume}</span>
              <input type="range" min="0.05" max="0.5" step="0.05" value={v.bgmVolume ?? 0.15} onChange={e => { setV({ ...v, bgmVolume: parseFloat(e.target.value) }); if (isPreviewingBgm) bgm.play(v.bgmType || 'musicbox', parseFloat(e.target.value)); }} style={{ flex: 1, accentColor: '#e2b96f' }} />
            </div>
            <div style={{ marginTop: 12, display: 'flex' }}>
              <button 
                className="btn-ghost" 
                style={{ flex: 1, padding: '10px', fontSize: 13 }}
                onClick={() => {
                  if (isPreviewingBgm) {
                    bgm.pause();
                    setIsPreviewingBgm(false);
                  } else {
                    bgm.play(v.bgmType || 'musicbox', v.bgmVolume ?? 0.15);
                    setIsPreviewingBgm(true);
                  }
                }}
              >
                {isPreviewingBgm ? t.bgmStop : t.bgmPreview}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 13 }}>
        <span className="label">🤖 {t.aiProv}</span>

        <select className="field" value={v.aiProvider} onChange={e => setV({ ...v, aiProvider: e.target.value })} style={{ marginBottom: 10 }}>
          {ai.map(o => <option key={o.k} value={o.k}>{o.l}</option>)}
        </select>
        <p style={{ fontSize: 12, color: '#5a80b8', marginBottom: 10, lineHeight: 1.55 }}>
          ℹ️ {aiNote}
          {aiUrl && <a href={aiUrl} target="_blank" rel="noreferrer" style={{ color: '#e2b96f', marginLeft: 8, textDecoration: 'none', fontWeight: 700 }}>{lang === 'zh' ? '取得 API 🔑' : 'Get API 🔑'}</a>}
        </p>
        <div style={{ position: 'relative' }}>
          <input className="field" type={showAi ? "text" : "password"} value={activeAiKey} onChange={e => updateAiKey(e.target.value)} placeholder={t.keyPH} style={{ paddingRight: 40 }} />
          <button onClick={() => setShowAi(!showAi)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.7 }}>
            {showAi ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 26 }}>
        <span className="label">🔊 {t.ttsProv}</span>
        <select className="field" value={v.ttsProvider} onChange={e => setV({ ...v, ttsProvider: e.target.value })} style={{ marginBottom: 10 }}>
          {tts.map(o => <option key={o.k} value={o.k}>{o.l}</option>)}
        </select>
        <p style={{ fontSize: 12, color: '#5a80b8', marginBottom: v.ttsProvider !== 'browser' ? 10 : 0, lineHeight: 1.55 }}>
          ℹ️ {ttsNote}
          {ttsUrl && v.ttsProvider !== 'browser' && <a href={ttsUrl} target="_blank" rel="noreferrer" style={{ color: '#e2b96f', marginLeft: 8, textDecoration: 'none', fontWeight: 700 }}>{lang === 'zh' ? '取得 API 🔑' : 'Get API 🔑'}</a>}
        </p>
        {v.ttsProvider !== 'browser' &&
          <div style={{ position: 'relative' }}>
            <input className="field" type={showTts ? "text" : "password"} value={activeTtsKey} onChange={e => updateTtsKey(e.target.value)} placeholder={t.keyPH} style={{ paddingRight: 40 }} />
            <button onClick={() => setShowTts(!showTts)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.7 }}>
              {showTts ? '🙈' : '👁️'}
            </button>
          </div>
        }
        {v.ttsProvider === 'browser' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: '#5a80b8', marginBottom: 10, lineHeight: 1.55 }}>
              <strong style={{ color: '#e2b96f' }}>{t.browserVoices}</strong>
              <div>{t.browserVoicesHint}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <span className="label">{t.browserVoiceSelect}</span>
              <select
                className="field"
                value={v.browserVoice || ''}
                onChange={e => setV({ ...v, browserVoice: e.target.value })}
              >
                <option value="">{t.browserVoiceAuto}</option>
                {browserVoices.map((voice) => (
                  <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
            <div style={{
              maxHeight: 220,
              overflowY: 'auto',
              borderRadius: 16,
              padding: 10,
              background: 'rgba(10, 25, 48, 0.24)',
              border: '1px solid rgba(226, 185, 111, 0.18)'
            }}>
              {browserVoices.length > 0 ? browserVoices.map((voice) => (
                <div key={`${voice.name}-${voice.lang}`} style={{
                  padding: '8px 10px',
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.04)',
                  marginBottom: 8,
                  color: '#eef4ff'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {voice.name}
                    {voice.default && <span style={{ marginLeft: 8, color: '#e2b96f', fontSize: 12 }}>{t.browserVoiceDefault}</span>}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>{voice.lang}</div>
                </div>
              )) : (
                <div style={{ fontSize: 12, color: '#eef4ff', opacity: 0.72 }}>
                  {t.browserVoicesEmpty}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {deferredPrompt && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(226, 185, 111, 0.4)' }}>
          <div style={{ fontSize: 13, color: '#eef4ff', fontWeight: 600 }}>
            {t.installApp}
          </div>
          <button className="btn-ghost-sm" style={{ margin: 0, color: '#e2b96f' }} onClick={handleInstallClick}>
            {lang === 'zh' ? '立刻安裝' : 'Install Now'}
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { T } from '../../locales/translations';

export function SettingsPage({ cfg, onSave, onBack, lang }) {
  const t = T[lang];
  const [v, setV] = useState(cfg);
  const [showAi, setShowAi] = useState(false);
  const [showTts, setShowTts] = useState(false);
  const [browserVoices, setBrowserVoices] = useState([]);
  
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
    { k: 'edge', l: 'Edge (Cloudflare Workers)', n: t.notes.edge },
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <button className="btn-ghost" onClick={onBack}>{t.back}</button>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#e2b96f' }}>{t.setTitle}</h2>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 13 }}>
        <span className="label">👶 {t.cName}</span>
        <input className="field" value={v.childName || ''} onChange={e => setV({ ...v, childName: e.target.value })} placeholder={t.cPH} />
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
            <input className="field" type={showTts || v.ttsProvider === 'edge' ? "text" : "password"} value={activeTtsKey} onChange={e => updateTtsKey(e.target.value)} placeholder={v.ttsProvider === 'edge' ? 'https://...' : t.keyPH} style={{ paddingRight: 40 }} />
            {v.ttsProvider !== 'edge' && (
              <button onClick={() => setShowTts(!showTts)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.7 }}>
                {showTts ? '🙈' : '👁️'}
              </button>
            )}
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

      <button className="btn-gold" onClick={() => onSave(v)}>{t.saveSet}</button>
    </div>
  );
}

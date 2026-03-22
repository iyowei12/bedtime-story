import React, { useState, useEffect, useRef } from 'react';
import { Moon } from '../ui/Moon';
import { T } from '../../locales/translations';
import { playBrowser, playElevenLabs, playOpenAITTS, playGoogleTTS } from '../../services/tts';

export function StoryPage({ story, lang, cfg, isAlreadySaved, onSave, onBack, onNew }) {
  const t = T[lang];
  const [playing, setPlaying] = useState(false);
  const [loadingTTS, setLoadingTTS] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(isAlreadySaved);
  const audioRef = useRef(null);

  useEffect(() => {
    setSaved(isAlreadySaved);
  }, [isAlreadySaved, story]);

  const stopAll = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(story).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onEnd = () => { setPlaying(false); setDimmed(true); };

  const handlePlay = async () => {
    // 若正在播放，則暫停（保留記憶體中的音檔）
    if (playing) { 
      if (audioRef.current) audioRef.current.pause();
      if (window.speechSynthesis) window.speechSynthesis.pause();
      setPlaying(false);
      return; 
    }
    // 防連點
    if (loadingTTS) return;

    // 若音檔已存在但處於暫停狀態，則直接繼續播放（完全不重新消耗配額）
    if (audioRef.current) {
      audioRef.current.play();
      setPlaying(true);
      return;
    }
    if (window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
      return;
    }
    
    // 第一次點擊朗讀，去跟雲端討聲音檔
    setLoadingTTS(true);
    try {
      const args = { story, lang, cfg, audioRef, onEnd, setPlaying };
      switch (cfg.ttsProvider) {
        case 'elevenlabs': await playElevenLabs(args); break;
        case 'openai': await playOpenAITTS(args); break;
        case 'google': await playGoogleTTS(args); break;
        default: playBrowser(args);
      }
    } catch (e) {
      alert('TTS Error: ' + e.message);
      setPlaying(false);
    } finally {
      setLoadingTTS(false);
    }
  };

  const handleRestart = () => { stopAll(); setDimmed(false); setTimeout(handlePlay, 200); };
  useEffect(() => () => stopAll(), []);

  return (
    <>
      {dimmed && (
        <div className="dim" onClick={() => setDimmed(false)}>
          <Moon size={88} />
          <p style={{ color: '#e2b96f', marginTop: 22, fontSize: 14, opacity: .65 }}>{t.tapLight}</p>
        </div>
      )}
      <div className="page" style={{ paddingTop: 38 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button className="btn-ghost" onClick={onBack}>{t.back}</button>
          <button className="btn-ghost" onClick={onNew}>{t.newStory}</button>
        </div>

        <div className="card" style={{ padding: '22px 20px', marginBottom: 18, maxHeight: '50vh', overflowY: 'auto' }}>
          <p className="story-text">{story}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn-gold" disabled={loadingTTS} onClick={handlePlay}>
            {loadingTTS ? (lang === 'zh' ? '⏳ 準備語音中...' : '⏳ Loading Audio...') : (playing ? t.pause : t.play)}
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <button className="btn-ghost" style={{ padding: '14px 4px', fontSize: 14 }} onClick={handleRestart}>{t.restart}</button>
            <button className="btn-ghost" style={{ padding: '14px 4px', fontSize: 13 }} onClick={handleCopy}>
              {copied ? (lang === 'zh' ? '✅ 已複製' : '✅ Copied') : (lang === 'zh' ? '📋 複製' : '📋 Copy')}
            </button>
            <button className="btn-ghost" style={{ padding: '14px 4px', fontSize: 14 }} disabled={saved}
              onClick={() => { onSave(story); setSaved(true); }}>
              {saved ? t.saved : t.save}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

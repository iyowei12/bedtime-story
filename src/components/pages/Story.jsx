import React, { useState, useEffect, useRef } from 'react';
import { Moon } from '../ui/Moon';
import { T } from '../../locales/translations';
import { playBrowser, playElevenLabs, playOpenAITTS, playGoogleTTS } from '../../services/tts';
import { bgm } from '../../services/bgm';
import { ConfirmModal } from '../ui/ConfirmModal';

export function StoryPage({ story, lang, cfg, isAlreadySaved, onSave, onBack, onNew }) {
  const t = T[lang];
  const [playing, setPlaying] = useState(false);
  const [loadingTTS, setLoadingTTS] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [saved, setSaved] = useState(isAlreadySaved);
  const audioRef = useRef(null);
  const browserPaused = useRef(false);

  useEffect(() => {
    setSaved(isAlreadySaved);
  }, [isAlreadySaved, story]);

  useEffect(() => {
    if (playing && cfg.bgmEnabled !== false) {
      bgm.play(cfg.bgmType || 'musicbox', cfg.bgmVolume ?? 0.15);
    } else {
      bgm.pause();
    }
  }, [playing, cfg.bgmEnabled, cfg.bgmType, cfg.bgmVolume]);

  const stopAll = () => {
    window.speechSynthesis?.cancel();
    browserPaused.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(story).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowTTSModal(true);
    });
  };

  const onEnd = () => { 
    setPlaying(false); 
    setDimmed(true); 
    browserPaused.current = false;
  };

  const handlePlay = async () => {
    // 若正在播放，則暫停（保留記憶體中的音檔）
    if (playing) { 
      if (audioRef.current) audioRef.current.pause();
      if (cfg.ttsProvider === 'browser' && window.speechSynthesis) {
        window.speechSynthesis.pause();
        browserPaused.current = true;
      }
      setPlaying(false);
      return; 
    }
    // 防連點
    if (loadingTTS) return;

    if (audioRef.current) {
      audioRef.current.play();
      setPlaying(true);
      return;
    }
    if (cfg.ttsProvider === 'browser' && browserPaused.current && window.speechSynthesis) {
      window.speechSynthesis.resume();
      browserPaused.current = false;
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

  const handleRestart = () => { 
    window.speechSynthesis?.cancel();
    browserPaused.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setDimmed(false); 
    setTimeout(handlePlay, 200); 
  };
  useEffect(() => () => { stopAll(); bgm.stop(); }, []);

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

      <ConfirmModal 
        visible={showTTSModal}
        title={lang === 'zh' ? '✅ 複製成功' : '✅ Copied Successfully'}
        content={t.confirmTTS}
        cancelText={lang === 'zh' ? '稍後再說' : 'Later'}
        confirmText={lang === 'zh' ? '前往 TTSMaker' : 'Go to TTSMaker'}
        onCancel={() => setShowTTSModal(false)}
        onConfirm={() => {
          setShowTTSModal(false);
          window.open('https://ttsmaker.com/zh-hk', '_blank', 'noopener,noreferrer');
        }}
      />
    </>
  );
}

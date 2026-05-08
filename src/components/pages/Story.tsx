import { useState, useEffect } from 'react';
import { bus } from '../../core/bus';
import { Moon } from '../ui/Moon';
import { T } from '../../locales/translations';
import { playTTS, pauseTTS, resumeTTS, stopTTS } from '../../services/tts';
import { ConfirmModal } from '../ui/ConfirmModal';
import { AppConfig, Language } from '../../types';

interface StoryPageProps {
  story: string;
  lang: Language;
  cfg: AppConfig;
  isAlreadySaved: boolean;
  onSave: (story: string) => void;
  onBack: () => void;
  onNew: () => void;
}

export function StoryPage({ story, lang, cfg, isAlreadySaved, onSave, onBack, onNew }: StoryPageProps) {
  const t = T[lang];
  const [playing, setPlaying] = useState(false);
  const [loadingTTS, setLoadingTTS] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [saved, setSaved] = useState(isAlreadySaved);
  const [audioLoaded, setAudioLoaded] = useState(false);

  useEffect(() => {
    setSaved(isAlreadySaved);
  }, [isAlreadySaved, story]);

  useEffect(() => {
    const onStateChange = (state: string) => {
      if (state === 'playing') setPlaying(true);
      if (state === 'paused' || state === 'stopped' || state === 'ended') setPlaying(false);
      if (state === 'ended') setDimmed(true);
    };
    bus.on('audio:tts_state_changed', onStateChange);
    return () => {
      bus.off('audio:tts_state_changed', onStateChange);
      stopTTS();
    };
  }, []);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(story).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShowTTSModal(true);
    });
  };



  const handlePlay = async () => {
    if (loadingTTS) return;

    if (playing) { 
      pauseTTS();
      return; 
    }

    if (audioLoaded) {
      resumeTTS();
      return;
    }
    
    // 第一次點擊朗讀
    setLoadingTTS(true);
    try {
      await playTTS({ story, lang, cfg });
      setAudioLoaded(true);
    } catch (e: unknown) {
      alert('TTS Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoadingTTS(false);
    }
  };

  const handleRestart = () => { 
    setDimmed(false); 
    stopTTS();
    setAudioLoaded(false);
    
    setLoadingTTS(true);
    playTTS({ story, lang, cfg })
      .then(() => setAudioLoaded(true))
      .catch((e: unknown) => alert('TTS Error: ' + (e instanceof Error ? e.message : String(e))))
      .finally(() => setLoadingTTS(false));
  };

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

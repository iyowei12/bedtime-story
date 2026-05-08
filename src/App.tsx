import React, { useState, useEffect } from 'react';
import { Stars } from './components/ui/Stars';
import { SettingsPage } from './components/pages/Settings';
import { LoadingPage } from './components/pages/Loading';
import { StoryPage } from './components/pages/Story';
import { LibraryPage } from './components/pages/Library';
import { HomePage } from './components/pages/Home';
import { useStorage } from './hooks/useStorage';
import { bus } from './core/bus';
import { T } from './locales/translations';

import { Language, StoryLength, AppConfig } from './types';

export default function App() {
  const [page, setPage] = useState<string>('home');
  const [lang, setLang] = useState<Language>('zh');
  const [len, setLen] = useState<StoryLength>(3);
  const [imgs, setImgs] = useState<string[]>([]);
  const [story, setStory] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { stories, cfg, syncStatus, isLoggedIn, saveCfg, saveStory, delStory } = useStorage();
  const t = T[lang];

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    
    // PWA Installation Prompt Capture
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBIP = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('✅ PWA Install Prompt Captured!');
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.addEventListener('beforeinstallprompt' as any, handleBIP);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => window.removeEventListener('beforeinstallprompt' as any, handleBIP);
  }, []);

  useEffect(() => {
    const onStoryReady = ({ text }: { text: string }) => {
      setStory(text);
      setPage('story');
    };
    const onAppError = ({ message }: { message: string }) => {
      setError(message);
      if (page === 'loading') setPage('home'); // 如果在載入中報錯，退回首頁
      else alert(message); // 如果在其他地方報錯，直接顯示 (Toast 替代方案)
    };

    bus.on('story:ready', onStoryReady);
    bus.on('app:error', onAppError);

    return () => {
      bus.off('story:ready', onStoryReady);
      bus.off('app:error', onAppError);
    };
  }, [page]);

  const handleGenerate = () => {
    if (imgs.length === 0) { setError(t.noPhoto); return; }
    setError(''); setPage('loading');
    bus.emit('story:request_generate', { imgs, len, cfg, lang });
  };

  const handleSaveCfg = (c: Partial<AppConfig>) => {
    saveCfg(c);
    setPage('home');
  };

  const wrap = (children: React.ReactNode) => (
    <div className="page-bg"><Stars />{children}</div>
  );

  if (page === 'settings') return wrap(
    <SettingsPage cfg={cfg} onSave={handleSaveCfg}
      syncStatus={syncStatus} isLoggedIn={isLoggedIn} onSync={(interactive) => bus.emit('sync:request', { interactive })} lang={lang}
      deferredPrompt={deferredPrompt} setDeferredPrompt={setDeferredPrompt} />
  );
  if (page === 'loading') return wrap(<LoadingPage lang={lang} />);
  if (page === 'story') return wrap(
    <StoryPage story={story} lang={lang} cfg={cfg}
      isAlreadySaved={stories.some(s => s.text === story)}
      onSave={(s: string) => saveStory(s, lang)} onBack={() => setPage('home')}
      onNew={() => { setImgs([]); setPage('home'); }} />
  );
  if (page === 'library') return wrap(
    <LibraryPage stories={stories}
      onSelect={(txt: string) => { setStory(txt); setPage('story'); }}
      onDelete={delStory} onBack={() => setPage('home')} lang={lang} />
  );

  return wrap(
    <HomePage
      lang={lang} setLang={setLang}
      imgs={imgs} setImgs={setImgs}
      len={len} setLen={setLen}
      cfg={cfg} error={error}
      onGenerate={handleGenerate}
      setPage={setPage}
    />
  );
}

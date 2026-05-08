import React, { useState, useEffect } from 'react';
import { Stars } from './components/ui/Stars';
import { SettingsPage } from './components/pages/Settings';
import { LoadingPage } from './components/pages/Loading';
import { StoryPage } from './components/pages/Story';
import { LibraryPage } from './components/pages/Library';
import { HomePage } from './components/pages/Home';
import { useStorage } from './hooks/useStorage';
import { generateStory } from './services/llm';
import { T } from './locales/translations';

import { Language, StoryLength, AppConfig } from './types';

export default function App() {
  const [page, setPage] = useState<string>('home');
  const [lang, setLang] = useState<Language>('zh');
  const [len, setLen] = useState<StoryLength>(3);
  const [imgs, setImgs] = useState<string[]>([]);
  const [story, setStory] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { stories, cfg, gToken, isSyncing, saveCfg, saveStory, delStory, handleDriveSync } = useStorage();
  const t = T[lang];

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    
    // PWA Installation Prompt Capture
    const handleBIP = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('✅ PWA Install Prompt Captured!');
    };
    window.addEventListener('beforeinstallprompt' as any, handleBIP);
    return () => window.removeEventListener('beforeinstallprompt' as any, handleBIP);
  }, []);

  const handleGenerate = async () => {
    if (imgs.length === 0) { setError(t.noPhoto); return; }
    setError(''); setPage('loading');
    
    try {
      const text = await generateStory({ imgs, len, cfg, lang });
      setStory(text);
      setPage('story');
    } catch (e: any) {
      setError(e.message);
      setPage('home');
    }
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
      gToken={gToken} isSyncing={isSyncing} onSync={handleDriveSync} lang={lang}
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

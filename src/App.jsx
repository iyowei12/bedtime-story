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

export default function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState('zh');
  const [len, setLen] = useState('3');
  const [img, setImg] = useState(null);
  const [story, setStory] = useState('');
  const [error, setError] = useState('');
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const { stories, cfg, gToken, isSyncing, saveCfg, saveStory, delStory, handleDriveSync } = useStorage();
  const t = T[lang];

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    
    // PWA Installation Prompt Capture
    const handleBIP = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBIP);
    return () => window.removeEventListener('beforeinstallprompt', handleBIP);
  }, []);

  const handleGenerate = async () => {
    if (!img) { setError(t.noPhoto); return; }
    setError(''); setPage('loading');
    
    try {
      const text = await generateStory({ img, len, cfg, lang });
      setStory(text);
      setPage('story');
    } catch (e) {
      setError(e.message);
      setPage('home');
    }
  };

  const handleSaveCfg = c => {
    saveCfg(c);
    setPage('home');
  };

  const wrap = children => (
    <div className="page-bg"><Stars />{children}</div>
  );

  if (page === 'settings') return wrap(
    <SettingsPage cfg={cfg} onSave={handleSaveCfg} onBack={() => setPage('home')} 
      gToken={gToken} isSyncing={isSyncing} onSync={handleDriveSync} lang={lang}
      deferredPrompt={deferredPrompt} setDeferredPrompt={setDeferredPrompt} />
  );
  if (page === 'loading') return wrap(<LoadingPage lang={lang} />);
  if (page === 'story') return wrap(
    <StoryPage story={story} lang={lang} cfg={cfg}
      isAlreadySaved={stories.some(s => s.text === story)}
      onSave={(s) => saveStory(s, lang)} onBack={() => setPage('home')}
      onNew={() => { setImg(null); setPage('home'); }} />
  );
  if (page === 'library') return wrap(
    <LibraryPage stories={stories}
      onSelect={txt => { setStory(txt); setPage('story'); }}
      onDelete={delStory} onBack={() => setPage('home')} lang={lang} />
  );

  return wrap(
    <HomePage
      lang={lang} setLang={setLang}
      img={img} setImg={setImg}
      len={len} setLen={setLen}
      cfg={cfg} error={error}
      onGenerate={handleGenerate}
      setPage={setPage}
    />
  );
}

import { useState, useEffect } from 'react';

const SK = 'bts_stories_v2';
const CK = 'bts_config_v2';

export const DEFAULT_CFG = {
  childName: '',
  aiProvider: 'claude',
  aiKey: '',
  ttsProvider: 'browser',
  ttsKey: ''
};

const load = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') || d;
  } catch {
    return d;
  }
};

export function useStorage() {
  const [stories, setStoriesState] = useState(() => load(SK, []));
  const [cfg, setCfgState] = useState(() => load(CK, DEFAULT_CFG));

  const saveCfg = (c) => {
    setCfgState(c);
    localStorage.setItem(CK, JSON.stringify(c));
  };

  const saveStory = (text, lang) => {
    const upd = [{ id: Date.now(), text, date: new Date().toISOString(), lang }, ...stories];
    setStoriesState(upd);
    localStorage.setItem(SK, JSON.stringify(upd));
  };

  const delStory = (id) => {
    const upd = stories.filter((s) => s.id !== id);
    setStoriesState(upd);
    localStorage.setItem(SK, JSON.stringify(upd));
  };

  return {
    stories, cfg,
    saveCfg, saveStory, delStory
  };
}

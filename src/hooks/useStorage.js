import { useState, useEffect } from 'react';
import { requestDriveAccess, syncWithDrive } from '../services/drive';

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
  const [gToken, setGToken] = useState(() => sessionStorage.getItem('GD_TOKEN') || null);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const handleDriveSync = async (interactive = true) => {
    if (!gToken && !interactive) return;

    if (!gToken) {
      return new Promise((resolve) => {
        requestDriveAccess((token) => {
          sessionStorage.setItem('GD_TOKEN', token);
          setGToken(token);
          doSync(token).then(resolve);
        }, (err) => { alert('Google Auth Error: ' + err.message); resolve(); });
      });
    } else {
      await doSync(gToken);
    }
  };

  const doSync = async (token) => {
    setIsSyncing(true);
    try {
      const merged = await syncWithDrive(token, stories);
      setStoriesState(merged);
      localStorage.setItem(SK, JSON.stringify(merged));
    } catch (e) {
      if (e.message.includes('401')) {
        sessionStorage.removeItem('GD_TOKEN');
        setGToken(null);
      }
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // 進入網頁如果有 token 就偷合同步
  useEffect(() => {
    if (gToken) handleDriveSync(false);
  }, []);

  return {
    stories, cfg, gToken, isSyncing,
    saveCfg, saveStory, delStory, handleDriveSync
  };
}

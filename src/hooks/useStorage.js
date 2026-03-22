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
  const [deletedIds, setDeletedIds] = useState(() => load('bts_deleted_v2', []));
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
    
    // 紀錄刪除清單，避免被雲端復活
    const newDel = [...deletedIds, id];
    setDeletedIds(newDel);
    localStorage.setItem('bts_deleted_v2', JSON.stringify(newDel));

    if (gToken) handleDriveSync(false);
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
      const payload = await syncWithDrive(token, stories, deletedIds);
      
      // 更新故事合輯
      setStoriesState(payload.stories);
      localStorage.setItem(SK, JSON.stringify(payload.stories));

      // 更新雲端共同維護的死亡筆記本
      setDeletedIds(payload.deletedIds);
      localStorage.setItem('bts_deleted_v2', JSON.stringify(payload.deletedIds));
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

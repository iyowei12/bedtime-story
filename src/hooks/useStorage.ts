import { useState, useEffect } from 'react';
import { bus } from '../core/bus';
import { AppConfig, StoryItem, Language, SyncStatus } from '../types';
import { normalizeCfg } from '../core/config';

const SK = 'bts_stories_v2';
const CK = 'bts_config_v2';



const load = <T>(k: string, d: T): T => {
  try {
    const item = localStorage.getItem(k);
    return item ? JSON.parse(item) : d;
  } catch {
    return d;
  }
};

export function useStorage() {
  const [stories, setStoriesState] = useState<StoryItem[]>(() => load(SK, []));
  const [deletedIds, setDeletedIds] = useState<(string | number)[]>(() => load('bts_deleted_v2', []));
  const [cfg, setCfgState] = useState<AppConfig>(() => normalizeCfg(load(CK, null)));
  
  // 提供給 UI 的同步狀態
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const onStorageChanged = (payload: { type: string, data?: unknown }) => {
      // 來自 SyncService 或其他 Tab 的變更，更新 React 狀態
      if (payload.type === 'cfg' && payload.data) {
        setCfgState(normalizeCfg(payload.data as Partial<AppConfig>));
      } else if (payload.type === 'stories' && payload.data) {
        setStoriesState(payload.data as StoryItem[]);
      }
    };
    
    const onSyncStatus = (status: SyncStatus) => {
      setSyncStatus(status);
    };
    
    const onAuthStateChanged = (user: import('firebase/auth').User | null) => {
      setIsLoggedIn(!!user);
    };

    bus.on('storage:changed', onStorageChanged);
    bus.on('sync:status', onSyncStatus);
    bus.on('auth:state_changed', onAuthStateChanged);

    return () => {
      bus.off('storage:changed', onStorageChanged);
      bus.off('sync:status', onSyncStatus);
      bus.off('auth:state_changed', onAuthStateChanged);
    };
  }, []);

  const saveCfg = (c: Partial<AppConfig>) => {
    const normalized = normalizeCfg({
      ...c,
      configUpdatedAt: new Date().toISOString()
    });
    setCfgState(normalized);
    localStorage.setItem(CK, JSON.stringify(normalized));
    bus.emit('storage:changed', { type: 'cfg', data: normalized, source: 'user' });
  };

  const saveStory = (text: string, lang: Language) => {
    const upd: StoryItem[] = [{ id: Date.now(), text, date: new Date().toISOString(), lang }, ...stories];
    setStoriesState(upd);
    localStorage.setItem(SK, JSON.stringify(upd));
    bus.emit('storage:changed', { type: 'stories', data: upd, source: 'user' });
  };

  const delStory = (id: string | number) => {
    const upd = stories.filter((s) => s.id !== id);
    setStoriesState(upd);
    localStorage.setItem(SK, JSON.stringify(upd));
    
    const newDel = [...deletedIds, id];
    setDeletedIds(newDel);
    localStorage.setItem('bts_deleted_v2', JSON.stringify(newDel));
    
    bus.emit('storage:changed', { type: 'stories', data: upd, source: 'user' });
  };

  return {
    stories, cfg, syncStatus, isLoggedIn,
    saveCfg, saveStory, delStory
  };
}

import { useState, useEffect, useCallback } from 'react';
import { requestDriveAccess, syncWithDrive } from '../services/drive';
import { AppConfig, StoryItem, Language } from '../types';

const SK = 'bts_stories_v2';
const CK = 'bts_config_v2';
const GT = 'GD_TOKEN';
const GTE = 'GD_TOKEN_EXPIRES_AT';

export const DEFAULT_CFG: AppConfig = {
  childName: '',
  childNameEn: '',
  nameHistory: [],
  configUpdatedAt: '',
  browserVoice: '',
  bgmEnabled: true,
  bgmType: 'musicbox',
  bgmVolume: 0.15,
  aiProvider: 'claude',
  aiKey: '',
  aiKeys: {
    claude: '',
    gemini: '',
    openai: ''
  },
  ttsProvider: 'browser',
  ttsKey: '',
  ttsKeys: {
    elevenlabs: '',
    google: ''
  }
};

const normalizeCfg = (cfg: Partial<AppConfig> | null): AppConfig => {
  const base: AppConfig = {
    ...DEFAULT_CFG,
    ...cfg,
    aiKeys: {
      ...DEFAULT_CFG.aiKeys,
      ...(cfg?.aiKeys || {})
    },
    ttsKeys: {
      ...DEFAULT_CFG.ttsKeys,
      ...(cfg?.ttsKeys || {})
    }
  };

  if (cfg?.aiKey && cfg?.aiProvider && !base.aiKeys?.[cfg.aiProvider]) {
    if (base.aiKeys) base.aiKeys[cfg.aiProvider] = cfg.aiKey;
  }

  if (cfg?.ttsKey && cfg?.ttsProvider && base.ttsProvider !== 'browser' && !base.ttsKeys?.[cfg.ttsProvider]) {
    if (base.ttsKeys) base.ttsKeys[cfg.ttsProvider] = cfg.ttsKey;
  }

  if (!base.configUpdatedAt) {
    base.configUpdatedAt = '';
  }

  return base;
};

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
  const [gToken, setGToken] = useState<string | null>(() => sessionStorage.getItem(GT) || null);
  const [isSyncing, setIsSyncing] = useState(false);

  const getStoredExpiry = useCallback(() => Number(sessionStorage.getItem(GTE) || '0'), []);
  const isTokenFresh = useCallback(() => {
    const expiresAt = getStoredExpiry();
    return !!gToken && !!expiresAt && Date.now() < expiresAt - 60_000;
  }, [gToken, getStoredExpiry]);
  
  const clearDriveToken = useCallback(() => {
    sessionStorage.removeItem(GT);
    sessionStorage.removeItem(GTE);
    setGToken(null);
  }, []);
  
  const persistDriveToken = useCallback(({ accessToken, expiresIn }: { accessToken: string; expiresIn: number }) => {
    const expiresAt = Date.now() + Math.max(0, expiresIn - 30) * 1000;
    sessionStorage.setItem(GT, accessToken);
    sessionStorage.setItem(GTE, String(expiresAt));
    setGToken(accessToken);
    return accessToken;
  }, []);
  
  const requestToken = useCallback((interactive: boolean) => new Promise<string>((resolve, reject) => {
    requestDriveAccess(
      (tokenInfo) => resolve(persistDriveToken(tokenInfo)),
      (err) => reject(err),
      { prompt: interactive ? '' : 'none' }
    );
  }), [persistDriveToken]);

  const saveCfg = (c: Partial<AppConfig>) => {
    const normalized = normalizeCfg({
      ...c,
      configUpdatedAt: new Date().toISOString()
    });
    setCfgState(normalized);
    localStorage.setItem(CK, JSON.stringify(normalized));

    if (gToken) handleDriveSync(false);
  };

  const saveStory = (text: string, lang: Language) => {
    const upd: StoryItem[] = [{ id: Date.now(), text, date: new Date().toISOString(), lang }, ...stories];
    setStoriesState(upd);
    localStorage.setItem(SK, JSON.stringify(upd));
    
    // 儲存新故事時也自動觸發背景同步
    if (gToken) handleDriveSync(false);
  };

  const delStory = (id: string | number) => {
    const upd = stories.filter((s) => s.id !== id);
    setStoriesState(upd);
    localStorage.setItem(SK, JSON.stringify(upd));
    
    // 紀錄刪除清單，避免被雲端復活
    const newDel = [...deletedIds, id];
    setDeletedIds(newDel);
    localStorage.setItem('bts_deleted_v2', JSON.stringify(newDel));

    if (gToken) handleDriveSync(false);
  };

  const doSync = useCallback(async (token: string) => {
    setIsSyncing(true);
    try {
      // 避免 React 閉包陷阱，永遠從 localStorage 抓取按下同步那一瞬間的最真實資料
      const currentStories = JSON.parse(localStorage.getItem(SK) || '[]');
      const currentDeletedIds = JSON.parse(localStorage.getItem('bts_deleted_v2') || '[]');
      const currentCfg = normalizeCfg(JSON.parse(localStorage.getItem(CK) || 'null'));
      
      const payload = await syncWithDrive(token, currentStories, currentDeletedIds, currentCfg);
      
      // 更新故事合輯
      setStoriesState(payload.stories);
      localStorage.setItem(SK, JSON.stringify(payload.stories));

      // 更新雲端共同維護的死亡筆記本
      setDeletedIds(payload.deletedIds);
      localStorage.setItem('bts_deleted_v2', JSON.stringify(payload.deletedIds));

      const mergedCfg = normalizeCfg({
        ...currentCfg,
        childName: payload.childName ?? currentCfg.childName,
        childNameEn: payload.childNameEn ?? currentCfg.childNameEn,
        nameHistory: payload.nameHistory ?? currentCfg.nameHistory,
        bgmEnabled: payload.bgmEnabled ?? currentCfg.bgmEnabled,
        bgmType: payload.bgmType ?? currentCfg.bgmType,
        bgmVolume: payload.bgmVolume ?? currentCfg.bgmVolume,
        configUpdatedAt: payload.configUpdatedAt ?? currentCfg.configUpdatedAt
      });
      setCfgState(mergedCfg);
      localStorage.setItem(CK, JSON.stringify(mergedCfg));
    } catch (e: unknown) {
      // 偵測 401 Unauthorized 或 403 Forbidden
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('[401]') || errMsg.includes('[403]') || errMsg.toLowerCase().includes('invalid authentication')) {
        console.warn('Authentication expired or invalid, clearing token...');
        clearDriveToken();
      }
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [clearDriveToken]);

  const handleDriveSync = useCallback(async (interactive = true) => {
    if (!interactive && !gToken) return;

    try {
      let token = gToken;
      if (!isTokenFresh()) {
        if (!interactive) {
          clearDriveToken();
          return;
        }
        token = await requestToken(true);
      }
      if (!token) return;
      await doSync(token);
    } catch (err: unknown) {
      if (!interactive) {
        clearDriveToken();
        return;
      }
      alert('Google Auth Error: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, [clearDriveToken, doSync, gToken, isTokenFresh, requestToken]);

  // 進入網頁如果有 token 就偷合同步
  useEffect(() => {
    if (gToken) handleDriveSync(false);
  }, [gToken, handleDriveSync]);

  return {
    stories, cfg, gToken, isSyncing,
    saveCfg, saveStory, delStory, handleDriveSync
  };
}

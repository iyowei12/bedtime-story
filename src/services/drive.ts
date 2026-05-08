import { AppConfig, StoryItem, NameProfile } from '../types';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'bedtime_stories_sync.json';

interface DriveAccessResponse {
  accessToken: string;
  expiresIn: number;
  scope: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token: string;
              expires_in: string;
              scope: string;
              error?: string;
            }) => void;
            error_callback?: (error: { type: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

// 要求與取得授權 Access Token
export const requestDriveAccess = (
  onSuccess: (res: DriveAccessResponse) => void,
  onError: (err: Error) => void,
  options: { prompt?: string } = {}
) => {
  if (!window.google) return onError?.(new Error('Google Identity Services script not loaded.'));
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    prompt: options.prompt ?? '',
    callback: (res) => {
      if (res.error) onError?.(new Error(res.error));
      else onSuccess?.({
        accessToken: res.access_token,
        expiresIn: Number(res.expires_in || 0),
        scope: res.scope || '',
      });
    },
    error_callback: (err) => onError?.(new Error(err.type || 'Google token request failed')),
  });
  client.requestAccessToken({
    prompt: options.prompt ?? ''
  });
};

const getHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`
});

// 尋找存在 AppData 的備份檔案
const findFile = async (token: string) => {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, { headers: getHeaders(token) });
  if (!r.ok) {
    const d = await r.json();
    throw new Error(`[${r.status}] ${d.error?.message || 'Drive API Error'}`);
  }
  const d = await r.json();
  return d.files?.length > 0 ? d.files[0] : null;
};

// 統步合併邏輯：上傳本地 + 下載雲端
export const syncWithDrive = async (token: string, localStories: StoryItem[], localDeletedIds: (string | number)[] = [], localCfg: AppConfig = {} as AppConfig) => {
  const file = await findFile(token);
  let cloudData: unknown = null;
  const fileId = file?.id as string | undefined;

  // 下載雲端現有資料
  if (fileId) {
    const rf = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: getHeaders(token) });
    if (!rf.ok) {
      const d = await rf.json();
      throw new Error(`[${rf.status}] ${d.error?.message || 'Download Error'}`);
    }
    cloudData = await rf.json();
  }

  let cloudStories: StoryItem[] = [];
  let cloudDeletedIds: (string | number)[] = [];
  let cloudChildName = '';
  let cloudChildNameEn = '';
  let cloudNameHistory: NameProfile[] = [];
  let cloudConfigUpdatedAt = '';
  
  // 向下相容舊版陣列格式
  if (Array.isArray(cloudData)) {
    cloudStories = cloudData;
  } else if (cloudData && typeof cloudData === 'object') {
    const cd = cloudData as Record<string, unknown>;
    cloudStories = (cd.stories as StoryItem[]) || [];
    cloudDeletedIds = (cd.deletedIds as (string | number)[]) || [];
    cloudChildName = (cd.childName as string) || '';
    cloudChildNameEn = (cd.childNameEn as string) || '';
    cloudNameHistory = (cd.nameHistory as NameProfile[]) || [];
    cloudConfigUpdatedAt = (cd.configUpdatedAt as string) || '';
  }

  // 1. 合併「死亡筆記本」(已刪除 ID 列表)
  const mergedDeletedIds = [...new Set([...localDeletedIds, ...cloudDeletedIds])];

  // 2. 濾除在任何裝置上被標記為刪除的故事
  cloudStories = cloudStories.filter(cs => !mergedDeletedIds.includes(cs.id));
  const activeLocal = localStories.filter(ls => !mergedDeletedIds.includes(ls.id));

  // 3. 合併去重複的故事陣列
  const mergedStories = [...activeLocal];
  cloudStories.forEach(cs => {
    if (!mergedStories.find(ls => ls.id === cs.id || ls.text === cs.text)) {
      mergedStories.push(cs);
    }
  });
  // 依時間排序 (最新的在前面)
  mergedStories.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 4. 合併設定與常用主角名單 (去重)
  const localConfigUpdatedAt = localCfg.configUpdatedAt || '';
  const shouldUseCloudCfg = cloudConfigUpdatedAt && (!localConfigUpdatedAt || new Date(cloudConfigUpdatedAt) > new Date(localConfigUpdatedAt));

  const mergedNameHistory = [...(localCfg.nameHistory || [])];
  cloudNameHistory.forEach(cn => {
    if (!mergedNameHistory.find(ln => ln.zh === cn.zh && ln.en === cn.en)) {
      mergedNameHistory.push(cn);
    }
  });

  const mergedChildName = shouldUseCloudCfg 
    ? (cloudChildName || localCfg.childName || '') 
    : (localCfg.childName || cloudChildName || '');

  const mergedChildNameEn = shouldUseCloudCfg 
    ? (cloudChildNameEn || localCfg.childNameEn || '') 
    : (localCfg.childNameEn || cloudChildNameEn || '');

  const finalNameHistory = shouldUseCloudCfg
    ? (cloudNameHistory?.length ? cloudNameHistory : mergedNameHistory)
    : (mergedNameHistory?.length ? mergedNameHistory : cloudNameHistory);

  const mergedConfigUpdatedAt = shouldUseCloudCfg ? cloudConfigUpdatedAt : localConfigUpdatedAt;

  // 寫回雲端的新格式
  const payload = {
    stories: mergedStories,
    deletedIds: mergedDeletedIds,
    childName: mergedChildName,
    childNameEn: mergedChildNameEn,
    nameHistory: finalNameHistory,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bgmEnabled: shouldUseCloudCfg ? ((cloudData as any)?.bgmEnabled ?? localCfg.bgmEnabled) : (localCfg.bgmEnabled ?? (cloudData as any)?.bgmEnabled),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bgmType: shouldUseCloudCfg ? ((cloudData as any)?.bgmType || localCfg.bgmType) : (localCfg.bgmType || (cloudData as any)?.bgmType),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bgmVolume: shouldUseCloudCfg ? ((cloudData as any)?.bgmVolume ?? localCfg.bgmVolume) : (localCfg.bgmVolume ?? (cloudData as any)?.bgmVolume),
    configUpdatedAt: mergedConfigUpdatedAt
  };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  
  if (fileId) {
    // 更新舊檔
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: blob
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(`[${res.status}] ${d.error?.message || 'Update Error'}`);
    }
  } else {
    // 建立新檔 (Multipart upload)
    const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);
    
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST', // FormData 自動處理 boundary
      headers: getHeaders(token),
      body: form
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(`[${res.status}] ${d.error?.message || 'Upload Error'}`);
    }
  }

  return payload;
};

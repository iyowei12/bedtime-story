const CLIENT_ID = '243955988744-kn1moqd9nrhffiqbv8urg9nr7blue3dj.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'bedtime_stories_sync.json';

// 要求與取得授權 Access Token
export const requestDriveAccess = (onSuccess, onError) => {
  if (!window.google) return onError?.(new Error('Google Identity Services script not loaded.'));
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (res) => {
      if (res.error) onError?.(new Error(res.error));
      else onSuccess?.(res.access_token);
    },
  });
  client.requestAccessToken();
};

const getHeaders = (token) => ({
  'Authorization': `Bearer ${token}`
});

// 尋找存在 AppData 的備份檔案
const findFile = async (token) => {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${FILE_NAME}'`, { headers: getHeaders(token) });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.files?.length > 0 ? d.files[0] : null;
};

// 統步合併邏輯：上傳本地 + 下載雲端
export const syncWithDrive = async (token, localStories) => {
  const file = await findFile(token);
  let cloudStories = [];
  let fileId = file?.id;

  // 下載雲端現有資料
  if (fileId) {
    const rf = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: getHeaders(token) });
    if (rf.ok) {
      cloudStories = await rf.json();
    }
  }

  // 合併去重複 (以唯一時間戳或文字內容為基準)
  const merged = [...localStories];
  cloudStories.forEach(cs => {
    if (!merged.find(ls => ls.text === cs.text || ls.date === cs.date)) {
      merged.push(cs);
    }
  });
  // 依時間排序 (最新的在前面)
  merged.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 寫回雲端
  const blob = new Blob([JSON.stringify(merged)], { type: 'application/json' });
  
  if (fileId) {
    // 更新舊檔
    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: blob
    });
  } else {
    // 建立新檔 (Multipart upload)
    const metadata = { name: FILE_NAME, parents: ['appDataFolder'] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);
    
    await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: getHeaders(token), // FormData 會自動生 boundary
      body: form
    });
  }

  return merged;
};

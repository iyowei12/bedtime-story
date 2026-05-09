import { bus } from '../core/bus';
import { normalizeCfg } from '../core/config';
import { loginWithGoogle, saveUserData, getUserData, logout, SyncPayload } from './firebase';

const SK = 'bts_stories_v2';
const CK = 'bts_config_v2';

class SyncService {
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  public isSyncing = false;
  private currentUid: string | null = null;

  constructor() {
    bus.on('sync:request', ({ interactive }) => {
      this.handleCloudSync(interactive);
    });

    bus.on('auth:state_changed', (user: import('firebase/auth').User | null) => {
      this.currentUid = user?.uid || null;
      if (this.currentUid) {
        // Automatically sync when user logs in or app initializes with a user
        this.handleCloudSync(false);
      }
    });

    bus.on('storage:changed', (payload) => {
      if (payload?.source === 'sync') return; // 避免同步造成的循環觸發

      if (this.currentUid) {
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
          this.handleCloudSync(false);
        }, 2000);
      }
    });
  }

  public clearAuth() {
    logout().catch(console.error);
    bus.emit('sync:status', 'idle');
  }

  private async doSync(uid: string) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    bus.emit('sync:status', 'syncing');

    try {
      const currentStories = JSON.parse(localStorage.getItem(SK) || '[]');
      const currentDeletedIds = JSON.parse(localStorage.getItem('bts_deleted_v2') || '[]');
      const currentCfgStr = localStorage.getItem(CK);
      const currentCfg = currentCfgStr ? JSON.parse(currentCfgStr) : {};

      // 1. Fetch remote data
      const remoteData = await getUserData(uid);

      // 2. Merge logic
      let mergedStories = [...currentStories];
      let mergedDeletedIds = [...currentDeletedIds];
      let mergedCfg = { ...currentCfg };

      if (remoteData) {
        // Merge Stories
        const remoteStories = remoteData.stories || [];
        const remoteDeletedIds = remoteData.deletedIds || [];
        
        const allDeleted = Array.from(new Set([...currentDeletedIds, ...remoteDeletedIds]));
        const storyMap = new Map();
        
        [...remoteStories, ...currentStories].forEach(s => {
          if (!allDeleted.includes(s.id || s.text)) {
            storyMap.set(s.id || s.text, s);
          }
        });
        
        mergedStories = Array.from(storyMap.values());
        mergedDeletedIds = allDeleted;

        // Merge Config (根據 timestamp 決定誰贏)
        const remoteTime = remoteData.cfg?.configUpdatedAt ? new Date(remoteData.cfg.configUpdatedAt).getTime() : 0;
        const localTime = currentCfg.configUpdatedAt ? new Date(currentCfg.configUpdatedAt).getTime() : 0;

        if (remoteTime > localTime) {
          // 雲端較新
          mergedCfg = normalizeCfg({
            ...currentCfg,
            ...remoteData.cfg,
            aiKeys: currentCfg.aiKeys,
            ttsKeys: currentCfg.ttsKeys,
            aiKey: currentCfg.aiKey,
            ttsKey: currentCfg.ttsKey,
          });
        } else {
          // 本地較新 (或是相等)
          mergedCfg = normalizeCfg({
            ...remoteData.cfg,
            ...currentCfg,
          });
        }
      }

      // 3. Save to remote (移除所有 API Keys，不上傳到 Firebase)
      const cfgForCloud = { ...mergedCfg };
      delete cfgForCloud.aiKeys;
      delete cfgForCloud.ttsKeys;
      delete cfgForCloud.aiKey;
      delete cfgForCloud.ttsKey;

      const payload: SyncPayload = {
        stories: mergedStories,
        deletedIds: mergedDeletedIds,
        cfg: cfgForCloud
      };
      await saveUserData(uid, payload);

      // 4. Save to local
      localStorage.setItem(SK, JSON.stringify(mergedStories));
      localStorage.setItem('bts_deleted_v2', JSON.stringify(mergedDeletedIds));
      localStorage.setItem(CK, JSON.stringify(mergedCfg));
      
      // 告訴 UI 去重取 LocalStorage，並標記來源為 'sync' 避免循環觸發
      bus.emit('storage:changed', { type: 'cfg', data: mergedCfg, source: 'sync' });
      bus.emit('storage:changed', { type: 'stories', data: mergedStories, source: 'sync' });
      bus.emit('sync:status', 'success');

    } catch (e: unknown) {
      console.warn('Sync failed:', e);
      bus.emit('sync:status', 'error');
      bus.emit('app:error', { message: 'Sync failed: ' + (e instanceof Error ? e.message : String(e)), source: 'Sync' });
    } finally {
      this.isSyncing = false;
    }
  }

  public async handleCloudSync(interactive = true) {
    if (!interactive && !this.currentUid) return;

    try {
      let uid = this.currentUid;
      if (!uid) {
        if (!interactive) return;
        const user = await loginWithGoogle();
        uid = user.uid;
      }
      await this.doSync(uid);
    } catch (err: unknown) {
      bus.emit('app:error', { message: 'Auth Error: ' + (err instanceof Error ? err.message : String(err)) });
      bus.emit('sync:status', 'error');
    }
  }
}

export const syncService = new SyncService();

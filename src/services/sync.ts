import { bus } from '../core/bus';
import { requestDriveAccess, syncWithDrive } from './drive';

// We need to duplicate or import normalizeCfg. For now, we redefine a simple version or expect payload to be normalized.
// Better: we'll import normalizeCfg from useStorage later, or we can just rely on the UI to normalize.
// Actually, doSync was parsing localStorage.
const SK = 'bts_stories_v2';
const CK = 'bts_config_v2';
const GT = 'GD_TOKEN';
const GTE = 'GD_TOKEN_EXPIRES_AT';

class SyncService {
  private syncTimeout: ReturnType<typeof setTimeout> | null = null;
  public isSyncing = false;

  constructor() {
    bus.on('sync:request', ({ interactive }) => {
      this.handleDriveSync(interactive);
    });

    bus.on('storage:changed', () => {
      if (this.getToken()) {
        if (this.syncTimeout) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
          this.handleDriveSync(false);
        }, 2000);
      }
    });
    
    // 初始化偷合同步
    setTimeout(() => {
       if (this.getToken()) this.handleDriveSync(false);
    }, 1000);
  }

  public getToken(): string | null {
    return sessionStorage.getItem(GT) || null;
  }

  private getStoredExpiry(): number {
    return Number(sessionStorage.getItem(GTE) || '0');
  }

  private isTokenFresh(): boolean {
    const token = this.getToken();
    const expiresAt = this.getStoredExpiry();
    return !!token && !!expiresAt && Date.now() < expiresAt - 60_000;
  }

  public clearDriveToken() {
    sessionStorage.removeItem(GT);
    sessionStorage.removeItem(GTE);
    bus.emit('sync:status', 'idle');
  }

  private persistDriveToken(accessToken: string, expiresIn: number) {
    const expiresAt = Date.now() + Math.max(0, expiresIn - 30) * 1000;
    sessionStorage.setItem(GT, accessToken);
    sessionStorage.setItem(GTE, String(expiresAt));
    return accessToken;
  }

  private requestToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      requestDriveAccess(
        (tokenInfo) => resolve(this.persistDriveToken(tokenInfo.accessToken, tokenInfo.expiresIn)),
        (err) => reject(err),
        { prompt: interactive ? '' : 'none' }
      );
    });
  }

  private async doSync(token: string) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    bus.emit('sync:status', 'syncing');

    try {
      const currentStories = JSON.parse(localStorage.getItem(SK) || '[]');
      const currentDeletedIds = JSON.parse(localStorage.getItem('bts_deleted_v2') || '[]');
      const currentCfgStr = localStorage.getItem(CK);
      const currentCfg = currentCfgStr ? JSON.parse(currentCfgStr) : {};

      const payload = await syncWithDrive(token, currentStories, currentDeletedIds, currentCfg);

      // 直接覆寫 LocalStorage，然後發送 storage:changed 讓 UI 重新載入
      localStorage.setItem(SK, JSON.stringify(payload.stories));
      localStorage.setItem('bts_deleted_v2', JSON.stringify(payload.deletedIds));

      const mergedCfg = {
        ...currentCfg,
        childName: payload.childName ?? currentCfg.childName,
        childNameEn: payload.childNameEn ?? currentCfg.childNameEn,
        nameHistory: payload.nameHistory ?? currentCfg.nameHistory,
        bgmEnabled: payload.bgmEnabled ?? currentCfg.bgmEnabled,
        bgmType: payload.bgmType ?? currentCfg.bgmType,
        bgmVolume: payload.bgmVolume ?? currentCfg.bgmVolume,
        configUpdatedAt: payload.configUpdatedAt ?? currentCfg.configUpdatedAt
      };
      localStorage.setItem(CK, JSON.stringify(mergedCfg));
      
      // 告訴 UI 去重取 LocalStorage，並標記來源為 'sync' 避免循環觸發
      bus.emit('storage:changed', { type: 'cfg', data: mergedCfg });
      bus.emit('storage:changed', { type: 'stories', data: payload.stories });
      bus.emit('sync:status', 'success');

    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.includes('[401]') || errMsg.includes('[403]') || errMsg.toLowerCase().includes('invalid authentication')) {
        console.warn('Authentication expired or invalid, clearing token...');
        this.clearDriveToken();
      }
      console.warn('Sync failed:', e);
      bus.emit('sync:status', 'error');
      bus.emit('app:error', { message: 'Sync failed: ' + errMsg, source: 'Sync' });
    } finally {
      this.isSyncing = false;
    }
  }

  public async handleDriveSync(interactive = true) {
    if (!interactive && !this.getToken()) return;

    try {
      let token = this.getToken();
      if (!this.isTokenFresh()) {
        if (!interactive) {
          this.clearDriveToken();
          return;
        }
        token = await this.requestToken(true);
      }
      if (!token) return;
      await this.doSync(token);
    } catch (err: unknown) {
      if (!interactive) {
        this.clearDriveToken();
        return;
      }
      bus.emit('app:error', { message: 'Google Auth Error: ' + (err instanceof Error ? err.message : String(err)) });
      bus.emit('sync:status', 'error');
    }
  }
}

export const syncService = new SyncService();

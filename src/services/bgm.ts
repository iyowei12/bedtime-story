import { bus } from '../core/bus';
import { AppConfig } from '../types';

class BGMService {
  private audio: HTMLAudioElement | null = null;
  private tracks: Record<string, string> = {
    lullaby: import.meta.env.BASE_URL + 'bgm/lullaby.m4a',
    musicbox: import.meta.env.BASE_URL + 'bgm/musicbox.m4a'
  };
  private currentType: string | null = null;
  private cfg: Partial<AppConfig> = {};
  private isPreviewing: boolean = false;

  constructor() {
    // 嘗試初始化配置
    try {
      const stored = localStorage.getItem('bedtime_story_cfg');
      if (stored) this.cfg = JSON.parse(stored);
    } catch {
      // ignore
    }

    bus.on('storage:changed', (payload) => {
      if (payload.type === 'cfg' && payload.data) {
        this.cfg = payload.data;
        // 如果正在播放且更換了 BGM 或關閉了 BGM，動態調整
        if (this.audio && !this.audio.paused && !this.isPreviewing) {
           if (this.cfg.bgmEnabled === false) {
             this.pause();
           } else {
             this.play(this.cfg.bgmType || 'musicbox', this.cfg.bgmVolume ?? 0.15);
           }
        }
      }
    });

    bus.on('audio:tts_started', () => {
      this.isPreviewing = false;
      if (this.cfg.bgmEnabled !== false) {
        this.play(this.cfg.bgmType || 'musicbox', this.cfg.bgmVolume ?? 0.15);
      }
    });

    bus.on('audio:tts_ended', () => {
      if (!this.isPreviewing) {
        this.pause();
      }
    });
    
    bus.on('audio:tts_state_changed', (state) => {
       if (state === 'paused' && !this.isPreviewing) this.pause();
       // "playing" state is handled by audio:tts_started conceptually, but we can refine later
    });
  }

  play(type: string, volume?: number) {
    if (!type || !this.tracks[type]) return;
    
    // 不同首歌、或是首次建立音檔資源
    if (!this.audio || this.currentType !== type) {
      if (this.audio) {
        this.audio.pause();
      }
      this.audio = new Audio(this.tracks[type]);
      this.audio.loop = true;
      this.currentType = type;
    }
    
    // 設定音量（稍微打折以確保不蓋過朗讀）
    this.audio.volume = (volume ?? 0.15) * 0.8;
    
    // 瀏覽器可能會在沒有使用者戶動的情況下阻擋自動播放
    this.audio.play().catch(e => console.warn('BGM play blocked:', e));
  }

  preview(type: string, volume?: number) {
    this.isPreviewing = true;
    this.play(type, volume);
  }

  pause() {
    if (this.audio) {
      this.audio.pause();
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }
}

export const bgm = new BGMService();

class BGMService {
  private audio: HTMLAudioElement | null = null;
  private tracks: Record<string, string> = {
    lullaby: import.meta.env.BASE_URL + 'bgm/lullaby.m4a',
    musicbox: import.meta.env.BASE_URL + 'bgm/musicbox.m4a'
  };
  private currentType: string | null = null;

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

import { AppConfig } from '../types';

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

export const normalizeCfg = (cfg: Partial<AppConfig> | null): AppConfig => {
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

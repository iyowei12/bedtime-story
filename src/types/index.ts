export type AIProvider = 'openai' | 'claude' | 'gemini';
export type TTSProvider = 'openai' | 'edge' | 'google' | 'azure' | 'browser' | 'elevenlabs';
export type Language = 'zh' | 'en';
export type StoryLength = 1 | 3 | 5;

export interface AIKeys {
  openai?: string;
  claude?: string;
  gemini?: string;
}

export interface TTSKeys {
  elevenlabs?: string;
  google?: string;
  [key: string]: string | undefined;
}

export interface NameProfile {
  zh: string;
  en: string;
  gender?: 'boy' | 'girl';
}

export interface AppConfig {
  aiProvider: AIProvider;
  aiKey?: string;
  aiKeys?: AIKeys;
  ttsProvider: TTSProvider;
  ttsKey?: string;
  ttsKeys?: TTSKeys;
  childName?: string;
  childNameEn?: string;
  voiceId?: string;
  voiceIdEn?: string;
  bgmEnabled?: boolean;
  bgmVolume?: number;
  bgmType?: string;
  driveToken?: string;
  lastSync?: string;
  configUpdatedAt?: string;
  browserVoice?: string;
  nameHistory?: NameProfile[];
  [key: string]: any;
}

export interface StoryItem {
  id: string | number;
  text: string;
  date: string;
  lang: Language;
  audioUrl?: string;
}

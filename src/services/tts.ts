import { AppConfig, Language } from '../types';
import { bus } from '../core/bus';

let globalAudio: HTMLAudioElement | null = null;

export const playBlob = (url: string) => {
  if (globalAudio) {
    globalAudio.pause();
  }
  globalAudio = new Audio(url);
  globalAudio.onended = () => {
    bus.emit('audio:tts_state_changed', 'ended');
    bus.emit('audio:tts_ended');
  };
  globalAudio.onerror = () => {
    bus.emit('audio:tts_state_changed', 'stopped');
    bus.emit('audio:tts_ended');
  };
  
  bus.emit('audio:tts_state_changed', 'playing');
  bus.emit('audio:tts_started');
  globalAudio.play().catch(console.error);
};

export const pauseTTS = () => {
  if (globalAudio && !globalAudio.paused) {
    globalAudio.pause();
    bus.emit('audio:tts_state_changed', 'paused');
  }
  if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
    bus.emit('audio:tts_state_changed', 'paused');
  }
};

export const resumeTTS = () => {
  if (globalAudio && globalAudio.paused) {
    globalAudio.play().catch(console.error);
    bus.emit('audio:tts_state_changed', 'playing');
  }
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    bus.emit('audio:tts_state_changed', 'playing');
  }
};

export const stopTTS = () => {
  if (globalAudio) {
    globalAudio.pause();
    globalAudio.currentTime = 0;
    bus.emit('audio:tts_state_changed', 'stopped');
    bus.emit('audio:tts_ended');
  }
  stopBrowserTTS();
};

const getTtsKey = (cfg: AppConfig, provider: string) => cfg.ttsKeys?.[provider]?.trim() || cfg.ttsKey?.trim() || '';
const getOpenAIKey = (cfg: AppConfig) => cfg.aiKeys?.openai?.trim() || cfg.aiKey?.trim() || '';

const findPreferredBrowserVoice = (
  voices: SpeechSynthesisVoice[],
  lang: Language,
  configuredVoice?: string
): SpeechSynthesisVoice | null => {
  if (!voices?.length) return null;

  if (configuredVoice) {
    const exact = voices.find((voice) => voice.name === configuredVoice);
    if (exact) return exact;
  }

  if (lang === 'zh') {
    const preferredNames = [
      'Microsoft HanHan Online - Chinese (Taiwan)',
      'Microsoft Hanhan - Chinese (Traditional, Taiwan)',
      'Microsoft Yating - Chinese (Traditional, Taiwan)'
    ];
    for (const name of preferredNames) {
      const match = voices.find((voice) => voice.name === name);
      if (match) return match;
    }
  }

  return voices.find((voice) => lang === 'zh'
    ? voice.lang.startsWith('zh-TW') || voice.lang.startsWith('zh_TW')
    : voice.lang.startsWith('en')
  ) || null;
};

let activeBrowserUtterance: SpeechSynthesisUtterance | null = null;

export const stopBrowserTTS = () => {
  if (activeBrowserUtterance) {
    activeBrowserUtterance.onend = null;
    activeBrowserUtterance.onerror = null;
    activeBrowserUtterance = null;
  }
  if (window.speechSynthesis) {
    bus.emit('audio:tts_state_changed', 'stopped');
    bus.emit('audio:tts_ended');
    window.speechSynthesis.cancel();
  }
};

export interface PlayTTSParams {
  story: string;
  lang: Language;
  cfg: AppConfig;
}

export const playBrowser = ({ story, lang, cfg }: PlayTTSParams) => {
  if (!window.speechSynthesis) return;
  stopTTS(); // 統一停止先前的播放
  const u = new SpeechSynthesisUtterance(story);
  activeBrowserUtterance = u;
  u.lang = lang === 'zh' ? 'zh-TW' : 'en-US';
  u.rate = .83; u.pitch = 1.06;
  
  const vs = window.speechSynthesis.getVoices();
  const pref = findPreferredBrowserVoice(vs, lang, cfg?.browserVoice);
  if (pref) u.voice = pref;
  
  u.onend = () => {
    bus.emit('audio:tts_state_changed', 'ended');
    bus.emit('audio:tts_ended');
  };
  u.onerror = () => {
    bus.emit('audio:tts_state_changed', 'stopped');
    bus.emit('audio:tts_ended');
  };
  
  bus.emit('audio:tts_state_changed', 'playing');
  bus.emit('audio:tts_started');
  window.speechSynthesis.speak(u);
};

export const playElevenLabs = async ({ story, lang, cfg }: PlayTTSParams) => {
  const k = getTtsKey(cfg, 'elevenlabs');
  if (!k) {
    alert(lang === 'zh' ? '請先在設定中填入 ElevenLabs API Key' : 'Please add ElevenLabs API Key in Settings');
    return;
  }
  const vid = lang === 'zh' ? 'EXAVITQu4vr4xnSDxMaL' : 'EXAVITQu4vr4xnSDxMaL';
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': k
    },
    body: JSON.stringify({
      text: story,
      model_id: 'eleven_multilingual_v2',
      language_code: lang === 'zh' ? 'zh' : 'en',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: .34,
        similarity_boost: .72,
        style: .28,
        speed: .9,
        use_speaker_boost: true
      }
    }),
  });
  if (!r.ok) {
    let detail = '';
    const contentType = r.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        const data = await r.json();
        detail = data.detail?.message || data.detail || data.message || JSON.stringify(data);
      } else {
        detail = await r.text();
      }
    } catch {
      detail = '';
    }
    throw new Error(`ElevenLabs: ${r.status}${detail ? ` - ${detail}` : ''}`);
  }
  playBlob(URL.createObjectURL(await r.blob()));
};

export const playOpenAITTS = async ({ story, lang, cfg }: PlayTTSParams) => {
  const k = getOpenAIKey(cfg);
  if (!k) {
    alert(lang === 'zh' ? '請先在設定中填入 OpenAI API Key' : 'Please add OpenAI API Key in Settings');
    return;
  }
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${k}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: story,
      voice: lang === 'zh' ? 'shimmer' : 'nova',
      instructions: lang === 'zh'
        ? '請用溫柔、平靜、像睡前說故事阿姨的語氣朗讀。語速稍慢，停頓自然，句尾輕柔，帶有安撫感，不要像播報員。'
        : 'Speak in a gentle, calm bedtime-story style. Read a little slowly, with natural pauses, soft sentence endings, and a soothing comforting tone. Avoid sounding like a news reader.',
      response_format: 'mp3',
      speed: lang === 'zh' ? .9 : .92
    }),
  });
  if (!r.ok) {
    let detail = '';
    const contentType = r.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        const data = await r.json();
        detail = data.error?.message || data.message || JSON.stringify(data);
      } else {
        detail = await r.text();
      }
    } catch {
      detail = '';
    }
    throw new Error(`OpenAI TTS: ${r.status}${detail ? ` - ${detail}` : ''}`);
  }
  playBlob(URL.createObjectURL(await r.blob()));
};

export const playGoogleTTS = async ({ story, lang, cfg }: PlayTTSParams) => {
  const k = getTtsKey(cfg, 'google');
  if (!k) {
    alert(lang === 'zh' ? '請先在設定中填入 Google Cloud TTS API Key' : 'Please add Google Cloud TTS API Key in Settings');
    return;
  }
  const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${k}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: story },
      voice: { languageCode: lang === 'zh' ? 'cmn-TW' : 'en-US', name: lang === 'zh' ? 'cmn-TW-Wavenet-A' : 'en-US-Neural2-F' },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: lang === 'zh' ? .82 : .86,
        pitch: lang === 'zh' ? -1.6 : -0.8
      },
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  playBlob(`data:audio/mp3;base64,${d.audioContent}`);
};

export const playTTS = async (args: PlayTTSParams) => {
  switch (args.cfg.ttsProvider) {
    case 'elevenlabs': await playElevenLabs(args); break;
    case 'openai': await playOpenAITTS(args); break;
    case 'google': await playGoogleTTS(args); break;
    default: playBrowser(args);
  }
};


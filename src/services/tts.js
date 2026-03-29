export const playBlob = (url, audioRef, onEnd, setPlaying) => {
  const a = new Audio(url);
  if (audioRef) audioRef.current = a;
  a.onended = onEnd;
  a.onerror = () => setPlaying(false);
  a.play();
  setPlaying(true);
};

const getTtsKey = (cfg, provider) => cfg.ttsKeys?.[provider]?.trim() || cfg.ttsKey?.trim() || '';
const getOpenAIKey = (cfg) => cfg.aiKeys?.openai?.trim() || cfg.aiKey?.trim() || '';

export const playBrowser = ({ story, lang, onEnd, setPlaying }) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(story);
  u.lang = lang === 'zh' ? 'zh-TW' : 'en-US';
  u.rate = .83; u.pitch = 1.06;
  
  const vs = window.speechSynthesis.getVoices();
  const pref = vs.find(x => lang === 'zh' ? x.lang.startsWith('zh-TW') || x.lang.startsWith('zh_TW') : x.lang.startsWith('en'));
  if (pref) u.voice = pref;
  
  u.onend = onEnd;
  u.onerror = () => setPlaying(false);
  
  window.speechSynthesis.speak(u);
  setPlaying(true);
};

export const playElevenLabs = async ({ story, lang, cfg, audioRef, onEnd, setPlaying }) => {
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
  playBlob(URL.createObjectURL(await r.blob()), audioRef, onEnd, setPlaying);
};

export const playOpenAITTS = async ({ story, lang, cfg, audioRef, onEnd, setPlaying }) => {
  const k = getOpenAIKey(cfg);
  if (!k) {
    alert(lang === 'zh' ? '請先在設定中填入 OpenAI API Key' : 'Please add OpenAI API Key in Settings');
    return;
  }
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${k}` },
    body: JSON.stringify({ model: 'tts-1', input: story, voice: 'nova', speed: .88 }),
  });
  if (!r.ok) throw new Error(`OpenAI TTS: ${r.status}`);
  playBlob(URL.createObjectURL(await r.blob()), audioRef, onEnd, setPlaying);
};

export const playGoogleTTS = async ({ story, lang, cfg, audioRef, onEnd, setPlaying }) => {
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
      audioConfig: { audioEncoding: 'MP3', speakingRate: .88 },
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  playBlob(`data:audio/mp3;base64,${d.audioContent}`, audioRef, onEnd, setPlaying);
};

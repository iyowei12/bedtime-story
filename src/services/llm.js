export async function generateStory({ imgs, len, cfg, lang }) {
  const wc = { 1: 120, 3: 370, 5: 600 }[len];
  const hero = lang === 'zh' ? (cfg.childName || '小寶') : (cfg.childNameEn || 'Buddy');
  const getAiKey = (provider) => cfg.aiKeys?.[provider]?.trim() || cfg.aiKey?.trim() || '';
  const prompt = lang === 'zh'
    ? `你是溫柔的說故事阿姨。根據這些故事書圖片，為3至5歲幼兒創作一個睡前故事。主角名字是「${hero}」，約${wc}個中文字。請使用短句子和簡單詞彙，讓故事溫馨有趣。結尾讓小朋友感到平靜、想睡覺。請直接開始說故事，不要有標題或前言。`
    : `You are a gentle storyteller. Based on these storybook images, write a bedtime story for children aged 3–5. The main character is named "${hero}". About ${wc} words. Use short sentences and simple vocabulary. Make it warm and imaginative. End calmly so the child feels sleepy. Begin the story directly — no title or preamble. IMPORTANT: The entire story MUST be written in English.`;


  let text = '';
  if (cfg.aiProvider === 'claude') {
    const key = getAiKey('claude');
    if (!key) throw new Error(lang === 'zh' ? '請先在設定中填入 Claude API Key' : 'Please add your Claude API Key in Settings');
    const claudeContent = imgs.map(img => {
      const b64 = img.split(',')[1];
      const mime = img.split(';')[0].split(':')[1] || 'image/jpeg';
      return { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } };
    });
    claudeContent.push({ type: 'text', text: prompt });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620', max_tokens: 1200,
        messages: [{ role: 'user', content: claudeContent }],
      }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    text = d.content?.[0]?.text || '';
  } else if (cfg.aiProvider === 'gemini') {
    const aiKeyClean = getAiKey('gemini');
    if (!aiKeyClean) throw new Error(lang === 'zh' ? '請先在設定中填入 Gemini API Key' : 'Please add your Gemini API Key in Settings');
    const geminiParts = imgs.map(img => {
      const b64 = img.split(',')[1];
      const mime = img.split(';')[0].split(':')[1] || 'image/jpeg';
      return { inline_data: { mime_type: mime, data: b64 } };
    });
    geminiParts.push({ text: prompt });

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiKeyClean}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: geminiParts }] }),
    });
    const d = await r.json();
    if (d.error) {
      if (d.error.message.includes('not found')) {
        throw new Error(`找不到該模型！\n原始報錯內容：${JSON.stringify(d.error)}\n\n請確認你的 API Key 權限，或切換至 OpenAI / Claude。`);
      }
      throw new Error(d.error.message);
    }
    text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else {
    const key = getAiKey('openai');
    if (!key) throw new Error(lang === 'zh' ? '請先在設定中填入 OpenAI API Key' : 'Please add your OpenAI API Key in Settings');
    const openaiContent = imgs.map(img => ({ type: 'image_url', image_url: { url: img } }));
    openaiContent.push({ type: 'text', text: prompt });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gpt-4o', max_tokens: 1200,
        messages: [{ role: 'user', content: openaiContent }],
      }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    text = d.choices?.[0]?.message?.content || '';
  }
  
  if (!text) throw new Error(lang === 'zh' ? '沒有收到回應，請再試一次' : 'Empty response — please try again');
  return text;
}

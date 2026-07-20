// Aether — config.js
// Settings, i18n translations (TH/EN), API config, localStorage persistence
var Aether = window.Aether || {};

// ── API Configuration ────────────────────────────

Aether.PROVIDERS = {
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    apiKeyField: 'apiKey',
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.9,
    // Pricing per 1M tokens (input/output)
    priceInput: 0.27,
    priceOutput: 1.10
  },
  gemini: {
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
    model: 'gemini-3.5-flash',
    apiKeyField: 'geminiKey',
    maxTokens: 2048,
    temperature: 0.7,
    topP: 0.9,
    // Gemini Flash is free tier (for now)
    priceInput: 0,
    priceOutput: 0
  }
};

// ── CSS Variables Injection ──────────────────────

Aether.THEME = {
  cyber: {
    bg:         '#0a0a1a',
    surface:    '#141432',
    border:     'rgba(0,240,255,0.15)',
    text:       '#e0e0f0',
    textDim:    '#8899bb',
    cyan:       '#00f0ff',
    magenta:    '#ff00ff',
    green:      '#00ff88',
    red:        '#ff4466',
    gold:       '#ffd700',
    glowCyan:   '0 0 20px rgba(0,240,255,0.4)',
    glowMagenta:'0 0 20px rgba(255,0,255,0.4)',
  },
  midnight: {
    bg:         '#0d1117',
    surface:    '#161b22',
    border:     'rgba(88,166,255,0.15)',
    text:       '#c9d1d9',
    textDim:    '#8b949e',
    cyan:       '#58a6ff',
    magenta:    '#bc8cff',
    green:      '#3fb950',
    red:        '#f85149',
    gold:       '#e3b341',
    glowCyan:   '0 0 20px rgba(88,166,255,0.4)',
    glowMagenta:'0 0 20px rgba(188,140,255,0.4)',
  },
  emerald: {
    bg:         '#0a1a0f',
    surface:    '#142818',
    border:     'rgba(0,255,136,0.15)',
    text:       '#d0f0d8',
    textDim:    '#88bb99',
    cyan:       '#00ff88',
    magenta:    '#88ff44',
    green:      '#44ff88',
    red:        '#ff4466',
    gold:       '#ffd700',
    glowCyan:   '0 0 20px rgba(0,255,136,0.4)',
    glowMagenta:'0 0 20px rgba(136,255,68,0.4)',
  }
};

// ── i18n Translations ────────────────────────────

Aether.I18N = {
  th: {
    app: { title: 'Aether', subtitle: 'ผู้ช่วย AI ด้วยเสียง' },
    orb: { idle: 'พร้อม', listening: 'กำลังฟัง...', thinking: 'กำลังคิด...', speaking: 'กำลังพูด...', error: 'ผิดพลาด' },
    chat: { placeholder: 'ถามอะไรก็ได้...', you: 'คุณ', aether: 'Aether', empty: 'เริ่มบทสนทนา — กดปุ่มไมค์เพื่อพูด' },
    controls: { mic: 'กดเพื่อพูด', stop: 'หยุด', settings: 'ตั้งค่า', clear: 'ล้าง', export: 'ส่งออก' },
    settings: {
      title: 'ตั้งค่า', lang: 'ภาษา', theme: 'ธีม', voice: 'เสียง',
      llmProvider: 'AI Model',
      voiceRate: 'ความเร็วเสียง', voicePitch: 'ระดับเสียง', apiKey: 'API Key (DeepSeek)',
      systemPrompt: 'System Prompt', streaming: 'แสดงผลแบบ streaming', continuous: 'ฟังต่อเนื่อง',
      geminiKey: 'Gemini Vision API Key',

      wakeWord: 'Wake Word (Hey Aether)',
      ttsLang: 'เสียง AI พูด',
      save: 'บันทึก', cancel: 'ยกเลิก', back: 'กลับ',
      apiKeyHint: 'รับ API key ได้ที่ platform.deepseek.com',
      geminiKeyHint: 'ใช้สำหรับวิเคราะห์รูปภาพ — รับ key ที่ aistudio.google.com',
      voiceHint: 'จะแสดงผลเมื่อโหลดเสียงจาก browser ครั้งแรก'
    },
    errors: {
      noMic: 'ไม่สามารถเข้าถึงไมโครโฟน กรุณาอนุญาตใน settings ของ browser',
      noSpeech: 'Browser นี้ไม่รองรับ Web Speech API กรุณาใช้ Chrome หรือ Edge',
      noApiKey: 'กรุณาใส่ DeepSeek API Key ใน Settings',
      apiError: 'เกิดข้อผิดพลาดในการเชื่อมต่อ API',
      network: 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ต'
    }
  },
  en: {
    app: { title: 'Aether', subtitle: 'Voice AI Assistant' },
    orb: { idle: 'Ready', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking...', error: 'Error' },
    chat: { placeholder: 'Ask me anything...', you: 'You', aether: 'Aether', empty: 'Start a conversation — press the mic button to talk' },
    controls: { mic: 'Hold to talk', stop: 'Stop', settings: 'Settings', clear: 'Clear', export: 'Export' },
    settings: {
      title: 'Settings', lang: 'Language', theme: 'Theme', voice: 'Voice',
      llmProvider: 'AI Model',
      voiceRate: 'Speech Rate', voicePitch: 'Pitch', apiKey: 'API Key (DeepSeek)',
      systemPrompt: 'System Prompt', streaming: 'Streaming response', continuous: 'Continuous listening',
      geminiKey: 'Gemini Vision API Key',
      wakeWord: 'Wake Word (\\"Hey Aether\\")',
      ttsLang: 'AI Voice Language',
      save: 'Save', cancel: 'Cancel', back: 'Back',
      apiKeyHint: 'Get your API key at platform.deepseek.com',
      geminiKeyHint: 'For image analysis — get key at aistudio.google.com',
      voiceHint: 'Voices load on first browser speech event'
    },
    errors: {
      noMic: 'Cannot access microphone. Please allow it in browser settings.',
      noSpeech: 'Your browser does not support Web Speech API. Please use Chrome or Edge.',
      noApiKey: 'Please enter your DeepSeek API Key in Settings.',
      apiError: 'API connection error.',
      network: 'Cannot connect to the internet.'
    }
  }
};

// ── Translation Helper ───────────────────────────

Aether.t = function(key) {
  var keys = key.split('.');
  var val = Aether.I18N[Aether.SETTINGS.lang] || Aether.I18N.en;
  for (var i = 0; i < keys.length; i++) {
    if (!val) return key;
    val = val[keys[i]];
  }
  return val || key;
};

// ── Default Settings ─────────────────────────────

Aether.DEFAULTS = {
  lang: 'th',
  theme: 'cyber',
  voiceName: '',
  voiceRate: 1.0,
  voicePitch: 1.0,
  apiKey: '',
  geminiKey: '',
  llmProvider: 'deepseek',
  ttsProvider: 'proxy',  // 'browser' | 'proxy' (Google TTS via Pipeline-Studio server)
  ttsLang: 'auto',        // 'auto' | 'th' | 'en' — TTS voice language
  ttsProxyUrl: 'http://localhost:4001/api/tts',
  systemPrompt: 'You are Aether, a brilliant and friendly AI assistant. You speak naturally and concisely. You answer in the same language the user speaks. Keep responses under 3 paragraphs unless asked for detail.',
  streamingEnabled: true,
  continuousListening: false,
  wakeWordEnabled: false
};

Aether.SETTINGS = {};

// ── Settings Load/Save ───────────────────────────

Aether.loadSettings = function() {
  try {
    var saved = localStorage.getItem('aether_settings');
    var parsed = saved ? JSON.parse(saved) : {};
    // Merge defaults with saved
    for (var k in Aether.DEFAULTS) {
      if (Aether.DEFAULTS.hasOwnProperty(k)) {
        Aether.SETTINGS[k] = parsed.hasOwnProperty(k) ? parsed[k] : Aether.DEFAULTS[k];
      }
    }
  } catch(e) {
    Aether.SETTINGS = Object.assign({}, Aether.DEFAULTS);
  }
};

Aether.saveSettings = function() {
  try {
    localStorage.setItem('aether_settings', JSON.stringify(Aether.SETTINGS));
  } catch(e) { /* quota exceeded — ignore */ }
};

// ── Apply Theme ──────────────────────────────────

Aether.applyTheme = function(name) {
  var t = Aether.THEME[name || Aether.SETTINGS.theme] || Aether.THEME.cyber;
  var root = document.documentElement;
  for (var key in t) {
    if (t.hasOwnProperty(key)) {
      root.style.setProperty('--aether-' + key, t[key]);
    }
  }
};

// ── Init ─────────────────────────────────────────

Aether.loadSettings();
Aether.applyTheme();

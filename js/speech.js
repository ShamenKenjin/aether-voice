// Aether — speech.js
// Web Speech API wrappers: Speech Recognition (STT) + Speech Synthesis (TTS)
var Aether = window.Aether || {};

// ── Speech Recognition (STT) ─────────────────────

Aether.SpeechInput = function() {
  this.recognition = null;
  this.isSupported = false;
  this.isListening = false;
  this.onResult = null;   // callback(finalText: string)
  this.onInterim = null;  // callback(interimText: string)
  this.onError = null;    // callback(error: string)
  this.onStateChange = null; // callback(isListening: boolean)
  this._init();
};

Aether.SpeechInput.prototype._init = function() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    this.isSupported = false;
    return;
  }

  this.recognition = new SpeechRecognition();
  this.recognition.continuous = false;
  this.recognition.interimResults = true;
  this.recognition.maxAlternatives = 1;

  // Auto-detect language from settings
  this._setLang();

  var self = this;
  this.recognition.onresult = function(e) {
    var interim = '';
    var final = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (final && self.onResult) self.onResult(final);
    if (interim && self.onInterim) self.onInterim(interim);
  };

  this.recognition.onerror = function(e) {
    self.isListening = false;
    if (self.onStateChange) self.onStateChange(false);
    var msg;
    switch (e.error) {
      case 'not-allowed': msg = Aether.t('errors.noMic'); break;
      case 'no-speech': msg = ''; break; // silent
      case 'network': msg = Aether.t('errors.network'); break;
      default: msg = e.error;
    }
    if (msg && self.onError) self.onError(msg);
  };

  this.recognition.onend = function() {
    self.isListening = false;
    if (self.onStateChange) self.onStateChange(false);
  };

  this.isSupported = true;
};

Aether.SpeechInput.prototype._setLang = function() {
  if (!this.recognition) return;
  var langMap = { th: 'th-TH', en: 'en-US' };
  this.recognition.lang = langMap[Aether.SETTINGS.lang] || 'th-TH';
};

Aether.SpeechInput.prototype.start = function() {
  if (!this.isSupported) {
    if (this.onError) this.onError(Aether.t('errors.noSpeech'));
    return;
  }
  this._setLang();
  try {
    this.recognition.start();
    this.isListening = true;
    if (this.onStateChange) this.onStateChange(true);
  } catch(e) {
    // Already started — restart
    this.stop();
    setTimeout(this.start.bind(this), 100);
  }
};

Aether.SpeechInput.prototype.stop = function() {
  if (!this.recognition) return;
  try { this.recognition.stop(); } catch(e) { /* ignore */ }
  this.isListening = false;
  if (this.onStateChange) this.onStateChange(false);
};

// ── Speech Synthesis (TTS) ───────────────────────

Aether.SpeechOutput = function() {
  this.synth = null;
  this.isSupported = true; // always true — proxy mode needs no browser API
  this.isSpeaking = false;
  this.voices = [];
  this.pendingQueue = [];
  this.currentAudio = null; // Audio element for proxy mode
  this.onStart = null;
  this.onEnd = null;
  this._init();
};

Aether.SpeechOutput.prototype._init = function() {
  if (window.speechSynthesis) {
    this.synth = window.speechSynthesis;
    var self = this;
    this._loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = function() { self._loadVoices(); };
    }
    // Chrome keep-alive
    setInterval(function() {
      if (self.isSpeaking && self.synth && self.synth.paused) self.synth.resume();
    }, 5000);
  }
};

Aether.SpeechOutput.prototype._loadVoices = function() {
  if (!this.synth) return;
  this.voices = this.synth.getVoices();
};

// ── Smart voice selection ────────────────────────

Aether.SpeechOutput.prototype._pickBestVoice = function() {
  this._loadVoices();
  var voices = this.voices;
  if (voices.length === 0) return null;

  var targetLang = (Aether.SETTINGS.ttsLang && Aether.SETTINGS.ttsLang !== 'auto')
    ? Aether.SETTINGS.ttsLang
    : (Aether.SETTINGS.lang === 'th' ? 'th' : 'en');
  var targetFull = targetLang === 'th' ? 'th-TH' : 'en-US';

  var scored = voices.map(function(v) {
    var score = 0;
    var name = (v.name || '').toLowerCase();
    var lang = (v.lang || '').toLowerCase();
    if (lang === targetFull) score += 100;
    else if (lang.indexOf(targetLang) === 0) score += 60;
    if (name.indexOf('neural') >= 0) score += 50;
    if (name.indexOf('google') >= 0) score += 45;
    if (name.indexOf('microsoft') >= 0) score += 40;
    if (name.indexOf('natural') >= 0) score += 40;
    if (name.indexOf('premium') >= 0) score += 35;
    if (name.indexOf('enhanced') >= 0) score += 30;
    if (name.indexOf('wavenet') >= 0) score += 30;
    if (name.indexOf('female') >= 0 || name.indexOf('woman') >= 0) score += 5;
    if (name.indexOf('default') >= 0) score -= 20;
    return { voice: v, score: score };
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.length > 0 ? scored[0].voice : null;
};

// ── Sentence splitting ───────────────────────────

Aether.SpeechOutput.prototype._splitSentences = function(text) {
  if (!text) return [];
  text = text.replace(/([.?!。！？])([^\s\d])/g, '$1 $2');
  text = text.replace(/(ค่ะ|ครับ|นะคะ|นะครับ|จ้ะ|จ้า|เลยค่ะ|เลยครับ)\s+/g, '$1\n');
  var raw = text.split(/\n+|(?<=[.?!。！？])\s+/);
  var sentences = [];
  for (var i = 0; i < raw.length; i++) {
    var s = raw[i].trim();
    if (s.length > 0) sentences.push(s);
    if (s.length > 200) {
      var parts = s.split(/[,;，；]\s*/);
      if (parts.length > 1) {
        sentences.pop();
        for (var j = 0; j < parts.length; j++) {
          var p = parts[j].trim();
          if (p) sentences.push(p);
        }
      }
    }
  }
  return sentences;
};

// ── Main speak (proxy first, browser fallback) ───

Aether.SpeechOutput.prototype._stripEmoji = function(text) {
  // Remove emoji and other symbols TTS can't pronounce
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{2764}\u{1F004}\u{1F0CF}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F201}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}\u{1F251}\u{1F310}-\u{1F320}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{260E}\u{2611}\u{2614}\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}\u{2623}\u{2626}\u{262A}\u{262E}\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{265F}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267E}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26A7}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')  // skin tone modifiers
    .replace(/🖼|📄|📎/g, '')  // our own file attachment indicators
    .replace(/\s{2,}/g, ' ')  // collapse double spaces
    .trim();
};

Aether.SpeechOutput.prototype.speak = function(text) {
  if (!text) return;
  this.stop();

  // Strip emoji before TTS
  text = this._stripEmoji(text);
  if (!text) return;

  if (Aether.SETTINGS.ttsProvider === 'gemini') {
    if (!Aether.SETTINGS.geminiKey) {
      // No Gemini key configured — auto-use browser
      this._speakBrowser(text);
    } else {
      this._speakGemini(text);
    }
  } else if (Aether.SETTINGS.ttsProvider === 'proxy') {
    this._speakProxy(text);
  } else {
    this._speakBrowser(text);
  }
};

// ── Proxy TTS (Google Translate via server) ──────

Aether.SpeechOutput.prototype._speakProxy = function(text) {
  var sentences = this._splitSentences(text);
  if (sentences.length === 0) { if (this.onEnd) this.onEnd(); return; }

  var chunks = [];
  var current = '';
  for (var i = 0; i < sentences.length; i++) {
    var s = sentences[i];
    if (current && (current + ' ' + s).length > 180) {
      chunks.push(current);
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current) chunks.push(current);

  this.isSpeaking = true;
  if (this.onStart) this.onStart();

  var self = this;
  var idx = 0;
  var lang = Aether.SETTINGS.lang === 'th' ? 'th' : 'en';
  var proxyFailed = false;

  function playNext() {
    if (proxyFailed || idx >= chunks.length) {
      if (proxyFailed && chunks.length > 0) {
        // Proxy unreachable — fallback to browser TTS for ALL remaining text
        self.isSpeaking = false;
        if (self.currentAudio) { self.currentAudio.pause(); self.currentAudio = null; }
        self._speakBrowser(text);
        return;
      }
      self.isSpeaking = false;
      if (self.onEnd) self.onEnd();
      return;
    }
    self._fetchAndPlay(chunks[idx], lang, function() {
      idx++;
      setTimeout(playNext, 350);
    }, function(err) {
      // Proxy failed — mark and fallback
      proxyFailed = true;
      playNext();
    });
  }

  playNext();
};

Aether.SpeechOutput.prototype._fetchAndPlay = function(text, lang, onDone, onError) {
  var self = this;
  var url = Aether.SETTINGS.ttsProxyUrl || 'http://localhost:4001/api/tts';

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text, voice: lang, rate: String(Aether.SETTINGS.voiceRate || 1.0) })
  })
  .then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.blob();
  })
  .then(function(blob) {
    var audio = new Audio();
    audio.src = URL.createObjectURL(blob);
    self.currentAudio = audio;
    audio.onended = function() {
      URL.revokeObjectURL(audio.src);
      self.currentAudio = null;
      if (onDone) onDone();
    };
    audio.onerror = function() {
      self.currentAudio = null;
      if (onError) onError('playback error');
    };
    audio.play().catch(function(e) {
      self.currentAudio = null;
      if (onError) onError(e.message);
    });
  })
  .catch(function(e) {
    self.currentAudio = null;
    if (onError) onError(e.message);
  });
};

// ── Gemini TTS (neural, natural voice) ──────────

Aether.SpeechOutput.prototype._pcmToWav = function(pcmData, sampleRate) {
  // Convert L16 PCM to WAV with proper header
  var numChannels = 1;
  var bitsPerSample = 16;
  var byteRate = sampleRate * numChannels * bitsPerSample / 8;
  var blockAlign = numChannels * bitsPerSample / 8;
  var dataSize = pcmData.byteLength;
  var buffer = new ArrayBuffer(44 + dataSize);
  var view = new DataView(buffer);

  // RIFF header
  var writeString = function(offset, str) {
    for (var i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  var pcmView = new Uint8Array(pcmData);
  var outView = new Uint8Array(buffer);
  outView.set(pcmView, 44);
  return buffer;
};

Aether.SpeechOutput.prototype._speakGemini = function(text) {
  var apiKey = Aether.SETTINGS.geminiKey;
  if (!apiKey) {
    // No Gemini key — fallback to browser TTS
    console.warn('Gemini TTS: no API key, falling back to browser');
    this.isSpeaking = false;
    this._speakBrowser(text);
    return;
  }

  var sentences = this._splitSentences(text);
  if (sentences.length === 0) { this.isSpeaking = false; if (this.onEnd) this.onEnd(); return; }

  // Group into chunks
  var chunks = [];
  var current = '';
  for (var i = 0; i < sentences.length; i++) {
    if (current && (current + ' ' + sentences[i]).length > 300) {
      chunks.push(current); current = sentences[i];
    } else {
      current = current ? current + ' ' + sentences[i] : sentences[i];
    }
  }
  if (current) chunks.push(current);

  this.isSpeaking = true;
  if (this.onStart) this.onStart();

  var self = this;
  var audioUrls = new Array(chunks.length); // pre-allocated slots
  var loaded = 0;
  var playIdx = 0;
  var playing = false;
  var fetchErrors = 0;

  // Fire ALL chunk fetches in parallel
  for (var c = 0; c < chunks.length; c++) {
    (function(idx) {
      self._fetchGeminiChunk(chunks[idx], apiKey, function(url) {
        if (url) {
          audioUrls[idx] = url;
        } else {
          fetchErrors++;
        }
        loaded++;
        if (!playing && audioUrls[0]) tryPlay();
        // If all failed, fallback
        if (loaded === chunks.length && fetchErrors === chunks.length) {
          self.isSpeaking = false;
          self._speakBrowser(text);
        }
      });
    })(c);
  }

  function tryPlay() {
    if (audioUrls[0]) { playing = true; playNext(); }
  }

  function playNext() {
    if (playIdx >= chunks.length) {
      self.isSpeaking = false;
      if (self.onEnd) self.onEnd();
      return;
    }

    var url = audioUrls[playIdx];
    if (url === undefined && fetchErrors > 0) {
      // This chunk failed to load — skip it
      playIdx++;
      playNext();
      return;
    }
    if (!url) {
      setTimeout(playNext, 30);
      return;
    }

    var audio = new Audio();
    audio.src = url;
    self.currentAudio = audio;
    var thisIdx = playIdx;
    playIdx++;

    audio.onended = function() {
      URL.revokeObjectURL(url);
      audioUrls[thisIdx] = null;
      self.currentAudio = null;
      playNext(); // 0ms gap — next chunk starts immediately
    };
    audio.onerror = function() {
      URL.revokeObjectURL(url);
      audioUrls[thisIdx] = null;
      self.currentAudio = null;
      playNext();
    };
    audio.play().catch(function() {
      URL.revokeObjectURL(url);
      audioUrls[thisIdx] = null;
      self.currentAudio = null;
      playNext();
    });
  }
};

// ── Browser TTS single chunk (fast, 0 latency) ──

Aether.SpeechOutput.prototype._speakBrowserChunk = function(text, onDone) {
  if (!this.synth) { if (onDone) onDone(); return; }

  var voice = null;
  if (Aether.SETTINGS.voiceName) {
    this._loadVoices();
    voice = this.voices.find(function(v) { return v.name === Aether.SETTINGS.voiceName; });
  }
  if (!voice) voice = this._pickBestVoice();

  var u = new SpeechSynthesisUtterance(text);
  u.rate = Aether.SETTINGS.voiceRate || 1.0;
  u.pitch = Aether.SETTINGS.voicePitch || 1.0;
  if (voice) u.voice = voice;
  u.onend = onDone;
  u.onerror = onDone;
  this.synth.speak(u);
};

// ── Gemini TTS: fetch + play single chunk ────────

Aether.SpeechOutput.prototype._fetchGeminiChunk = function(text, apiKey, onReady) {
  var lang = (Aether.SETTINGS.ttsLang && Aether.SETTINGS.ttsLang !== 'auto')
    ? Aether.SETTINGS.ttsLang
    : (Aether.SETTINGS.lang === 'th' ? 'th' : 'en');

  var voicePrompt = lang === 'th'
    ? 'พูดต่อเนื่องเป็นธรรมชาติแบบคนไทย: ' + text
    : 'Speak continuously and naturally: ' + text;

  var self = this;
  fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: voicePrompt }] }],
      generationConfig: { responseModalities: ['AUDIO'] }
    })
  })
  .then(function(res) { return res.ok ? res.json() : Promise.reject('HTTP '+res.status); })
  .then(function(data) {
    var audioData = null;
    for (var c = 0; c < (data.candidates || []).length; c++) {
      for (var p = 0; p < (data.candidates[c].content?.parts || []).length; p++) {
        var part = data.candidates[c].content.parts[p];
        if (part.inlineData && part.inlineData.data) audioData = part.inlineData.data;
      }
    }
    if (!audioData) { onReady(null); return; }
    var binaryStr = atob(audioData);
    var pcmBytes = new Uint8Array(binaryStr.length);
    for (var i = 0; i < binaryStr.length; i++) pcmBytes[i] = binaryStr.charCodeAt(i);
    var wavBuffer = self._pcmToWav(pcmBytes.buffer, 24000);
    var blob = new Blob([wavBuffer], { type: 'audio/wav' });
    onReady(URL.createObjectURL(blob));
  })
  .catch(function() { onReady(null); });
};

Aether.SpeechOutput.prototype._fetchAndPlayGemini = function(text, apiKey, onDone, onError) {
  var self = this;
  this._fetchGeminiChunk(text, apiKey, function(audioUrl) {
    if (!audioUrl) { if (onError) onError(); return; }
    var audio = new Audio();
    audio.src = audioUrl;
    self.currentAudio = audio;
    audio.onended = function() { URL.revokeObjectURL(audioUrl); self.currentAudio = null; if (onDone) onDone(); };
    audio.onerror = function() { URL.revokeObjectURL(audioUrl); self.currentAudio = null; if (onError) onError(); };
    audio.play().catch(function() { URL.revokeObjectURL(audioUrl); self.currentAudio = null; if (onError) onError(); });
  });
};

// ── Browser TTS (SpeechSynthesis) ────────────────

Aether.SpeechOutput.prototype._speakBrowser = function(text) {
  if (!this.synth) { if (this.onEnd) this.onEnd(); return; }

  var voice = null;
  if (Aether.SETTINGS.voiceName) {
    this._loadVoices();
    voice = this.voices.find(function(v) { return v.name === Aether.SETTINGS.voiceName; });
  }
  if (!voice) voice = this._pickBestVoice();

  var sentences = this._splitSentences(text);
  if (sentences.length === 0) { if (this.onEnd) this.onEnd(); return; }

  this.pendingQueue = [];
  var self = this;

  for (var i = 0; i < sentences.length; i++) {
    (function(idx, sentence) {
      self.pendingQueue.push(function() {
        var u = new SpeechSynthesisUtterance(sentence);
        u.rate = Aether.SETTINGS.voiceRate || 1.0;
        u.pitch = Aether.SETTINGS.voicePitch || 1.0;
        if (voice) u.voice = voice;

        var pause = 200;
        if (sentence.endsWith('?')) pause = 400;
        if (sentence.endsWith('.')) pause = 300;

        u.onstart = function() {
          self.isSpeaking = true;
          if (idx === 0 && self.onStart) self.onStart();
        };
        u.onend = function() {
          if (idx + 1 < sentences.length) {
            setTimeout(function() { self._speakNext(); }, pause);
          } else {
            self.isSpeaking = false;
            self.pendingQueue = [];
            if (self.onEnd) self.onEnd();
          }
        };
        u.onerror = function() {
          if (idx + 1 < sentences.length) {
            setTimeout(function() { self._speakNext(); }, 100);
          } else {
            self.isSpeaking = false;
            self.pendingQueue = [];
            if (self.onEnd) self.onEnd();
          }
        };
        self.synth.speak(u);
      });
    })(i, sentences[i]);
  }

  this._speakNext();
};

Aether.SpeechOutput.prototype._speakNext = function() {
  if (this.pendingQueue.length > 0) {
    var next = this.pendingQueue.shift();
    next();
  }
};

Aether.SpeechOutput.prototype.stop = function() {
  this.pendingQueue = [];
  if (this.currentAudio) {
    this.currentAudio.pause();
    this.currentAudio = null;
  }
  if (this.synth) {
    this.synth.cancel();
    this.isSpeaking = false;
  }
};

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

  var targetLang = Aether.SETTINGS.lang === 'th' ? 'th' : 'en';
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

// ── Main speak (routes to browser or proxy) ──────

Aether.SpeechOutput.prototype.speak = function(text) {
  if (!text) return;
  this.stop();

  if (Aether.SETTINGS.ttsProvider === 'proxy') {
    this._speakProxy(text);
  } else {
    this._speakBrowser(text);
  }
};

// ── Proxy TTS (Google Translate via server) ──────

Aether.SpeechOutput.prototype._speakProxy = function(text) {
  var sentences = this._splitSentences(text);
  if (sentences.length === 0) { if (this.onEnd) this.onEnd(); return; }

  // For proxy mode, batch sentences to stay under 200 char limit
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

  function playNext() {
    if (idx >= chunks.length) {
      self.isSpeaking = false;
      if (self.onEnd) self.onEnd();
      return;
    }
    self._fetchAndPlay(chunks[idx], lang, function() {
      idx++;
      // Natural pause between chunks
      setTimeout(playNext, 350);
    }, function(err) {
      // Skip on error, try next
      idx++;
      setTimeout(playNext, 100);
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

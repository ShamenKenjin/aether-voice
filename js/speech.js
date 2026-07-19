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
  this.isSupported = false;
  this.isSpeaking = false;
  this.voices = [];
  this.onStart = null;  // callback()
  this.onEnd = null;    // callback()
  this._init();
};

Aether.SpeechOutput.prototype._init = function() {
  if (!window.speechSynthesis) {
    this.isSupported = false;
    return;
  }
  this.synth = window.speechSynthesis;
  this.isSupported = true;

  // Load voices (may need async on some browsers)
  var self = this;
  this._loadVoices();
  if (this.synth.onvoiceschanged !== undefined) {
    this.synth.onvoiceschanged = function() { self._loadVoices(); };
  }
};

Aether.SpeechOutput.prototype._loadVoices = function() {
  if (!this.synth) return;
  this.voices = this.synth.getVoices();
};

Aether.SpeechOutput.prototype.getVoices = function() {
  this._loadVoices();
  // Filter by language
  var lang = Aether.SETTINGS.lang === 'th' ? 'th' : 'en';
  return this.voices.filter(function(v) {
    return v.lang.indexOf(lang) === 0;
  });
};

Aether.SpeechOutput.prototype.speak = function(text) {
  if (!this.isSupported || !this.synth) return;

  // Cancel any ongoing speech
  this.stop();

  var utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = Aether.SETTINGS.voiceRate || 1.0;
  utterance.pitch = Aether.SETTINGS.voicePitch || 1.0;

  // Select voice
  if (Aether.SETTINGS.voiceName) {
    this._loadVoices();
    var found = this.voices.find(function(v) { return v.name === Aether.SETTINGS.voiceName; });
    if (found) utterance.voice = found;
  } else {
    // Auto-select based on lang
    var lang = Aether.SETTINGS.lang === 'th' ? 'th-TH' : 'en-US';
    var defVoice = this.voices.find(function(v) { return v.lang === lang; });
    if (defVoice) utterance.voice = defVoice;
  }

  var self = this;
  utterance.onstart = function() {
    self.isSpeaking = true;
    if (self.onStart) self.onStart();
  };
  utterance.onend = function() {
    self.isSpeaking = false;
    if (self.onEnd) self.onEnd();
  };
  utterance.onerror = function() {
    self.isSpeaking = false;
    if (self.onEnd) self.onEnd();
  };

  this.synth.speak(utterance);
};

Aether.SpeechOutput.prototype.stop = function() {
  if (this.synth) {
    this.synth.cancel();
    this.isSpeaking = false;
  }
};

Aether.SpeechOutput.prototype.pause = function() {
  if (this.synth) this.synth.pause();
};

Aether.SpeechOutput.prototype.resume = function() {
  if (this.synth) this.synth.resume();
};

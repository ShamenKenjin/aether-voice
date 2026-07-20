// Aether — wakeword.js
// "Hey Aether" wake word detection using Web Speech API (continuous listening)
var Aether = window.Aether || {};

Aether.WakeWord = function() {
  this.recognition = null;
  this.isSupported = false;
  this.isActive = false;
  this.onWake = null;       // callback() when wake word detected
  this._restartTimeout = null;
  this._init();
};

Aether.WakeWord.prototype._init = function() {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    this.isSupported = false;
    return;
  }

  this.recognition = new SpeechRecognition();
  this.recognition.continuous = true;
  this.recognition.interimResults = true;
  this.recognition.maxAlternatives = 3;

  var langMap = { th: 'th-TH', en: 'en-US' };
  this.recognition.lang = langMap[Aether.SETTINGS.lang] || 'en-US';

  var self = this;

  this.recognition.onresult = function(e) {
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var transcript = '';
      // Check all alternatives
      var result = e.results[i];
      for (var j = 0; j < result.length; j++) {
        transcript = result[j].transcript.toLowerCase().trim();
        if (self._checkWakeWord(transcript)) {
          if (self.onWake) self.onWake();
          // Stop wake word listening temporarily (main mic flow takes over)
          self.stop();
          return;
        }
      }
    }
  };

  this.recognition.onerror = function(e) {
    if (e.error === 'no-speech' || e.error === 'aborted') {
      // Normal — restart if still active
      if (self.isActive) {
        self._scheduleRestart();
      }
      return;
    }
    // Other errors — retry
    if (self.isActive) {
      self._scheduleRestart();
    }
  };

  this.recognition.onend = function() {
    if (self.isActive) {
      self._scheduleRestart();
    }
  };

  this.isSupported = true;
};

Aether.WakeWord.prototype._checkWakeWord = function(text) {
  // English wake words
  var enPatterns = [
    'hey aether', 'hey ether', 'hey either',
    'a ether', 'hey eather', 'aether'
  ];
  // Thai wake words
  var thPatterns = [
    'เฮ้ อีเทอร์', 'เฮ้อีเทอร์', 'เฮ้ อีเธอร์', 'เฮ้อีเธอร์',
    'เฮอีเทอร์', 'hey อีเทอร์', 'เออีเทอร์'
  ];

  var patterns = Aether.SETTINGS.lang === 'th'
    ? thPatterns.concat(enPatterns)
    : enPatterns.concat(thPatterns);

  for (var i = 0; i < patterns.length; i++) {
    if (text.indexOf(patterns[i]) >= 0) return true;
  }
  return false;
};

Aether.WakeWord.prototype._scheduleRestart = function() {
  var self = this;
  clearTimeout(this._restartTimeout);
  this._restartTimeout = setTimeout(function() {
    if (self.isActive) self.start();
  }, 500);
};

Aether.WakeWord.prototype.start = function() {
  if (!this.isSupported || !this.isActive) return;
  try {
    var langMap = { th: 'th-TH', en: 'en-US' };
    this.recognition.lang = langMap[Aether.SETTINGS.lang] || 'en-US';
    this.recognition.start();
  } catch(e) {
    // Already started — schedule restart
    this._scheduleRestart();
  }
};

Aether.WakeWord.prototype.stop = function() {
  if (!this.recognition) return;
  clearTimeout(this._restartTimeout);
  try { this.recognition.stop(); } catch(e) { /* ignore */ }
};

Aether.WakeWord.prototype.activate = function() {
  this.isActive = true;
  this.start();
};

Aether.WakeWord.prototype.deactivate = function() {
  this.isActive = false;
  this.stop();
};

Aether.WakeWord.prototype.updateLang = function() {
  if (!this.recognition) return;
  var langMap = { th: 'th-TH', en: 'en-US' };
  this.recognition.lang = langMap[Aether.SETTINGS.lang] || 'en-US';
  if (this.isActive) {
    this.stop();
    this.start();
  }
};

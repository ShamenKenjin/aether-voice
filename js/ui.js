// Aether — ui.js
// Chat bubbles, control bar, settings panel, export dialog
var Aether = window.Aether || {};

Aether.UI = function() {
  this.orb = null;          // set by app.js
  this.onMicPress = null;   // callback()
  this.onMicRelease = null; // callback()
  this.onClear = null;      // callback()
  this._init();
};

// ── Init ─────────────────────────────────────────

Aether.UI.prototype._init = function() {
  this._bindControls();
  this._bindSettings();
  this._updateTexts();
};

// ── Control Bar Bindings ────────────────────────

Aether.UI.prototype._bindControls = function() {
  var self = this;

  // Mic button — hold to talk
  var micBtn = document.getElementById('btn-mic');
  micBtn.addEventListener('mousedown', function(e) {
    e.preventDefault();
    if (self.onMicPress) self.onMicPress();
  });
  micBtn.addEventListener('mouseup', function(e) {
    e.preventDefault();
    if (self.onMicRelease) self.onMicRelease();
  });
  micBtn.addEventListener('mouseleave', function(e) {
    // Only release if we were pressing
    if (micBtn.classList.contains('listening') || micBtn.classList.contains('error')) {
      if (self.onMicRelease) self.onMicRelease();
    }
  });

  // Touch events for mobile
  micBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    if (self.onMicPress) self.onMicPress();
  });
  micBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (self.onMicRelease) self.onMicRelease();
  });

  // Settings button
  document.getElementById('btn-settings').addEventListener('click', function() {
    self.showSettings();
  });

  // Clear button
  document.getElementById('btn-clear').addEventListener('click', function() {
    if (self.onClear) self.onClear();
  });

  // Text input
  var textInput = document.getElementById('text-input');
  textInput.placeholder = Aether.t('chat.placeholder');
  textInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      self._submitText();
    }
  });

  document.getElementById('btn-send').addEventListener('click', function() {
    self._submitText();
  });

  // File attachment
  document.getElementById('btn-attach').addEventListener('click', function() {
    document.getElementById('file-input').click();
  });

  var self = this;
  this._attachedFile = null;
  document.getElementById('file-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    self._attachedFile = file;
    self._showFilePreview(file);
  });
};

// ── Mic Button States ────────────────────────────

Aether.UI.prototype.setMicState = function(state) {
  var btn = document.getElementById('btn-mic');
  btn.className = 'mic-btn';
  if (state === 'listening') btn.classList.add('listening');
  if (state === 'error') btn.classList.add('error');
};

Aether.UI.prototype.setMicEnabled = function(enabled) {
  var btn = document.getElementById('btn-mic');
  btn.style.opacity = enabled ? '1' : '0.4';
  btn.style.pointerEvents = enabled ? 'auto' : 'none';
};

// ── Orb State ────────────────────────────────────

Aether.UI.prototype.setOrbState = function(state) {
  if (this.orb) this.orb.setState(state);

  var label = document.getElementById('orb-label');
  label.className = 'orb-label state-' + state;
  label.textContent = Aether.t('orb.' + state) || state;
};

// ── Chat Rendering ───────────────────────────────

Aether.UI.prototype.renderMessages = function(messages) {
  var container = document.getElementById('chat-messages');
  var empty = document.getElementById('chat-empty');

  if (!messages || messages.length === 0) {
    // Remove only chat bubbles, keep chat-empty
    this._clearBubbles(container);
    if (empty) {
      empty.style.display = 'flex';
      empty.textContent = Aether.t('chat.empty');
    }
    return;
  }

  if (empty) empty.style.display = 'none';

  // Only re-render changed messages
  var currentCount = container.querySelectorAll('.chat-msg').length;

  if (currentCount !== messages.length || currentCount === 0) {
    // Remove old bubbles, keep chat-empty
    this._clearBubbles(container);
    for (var i = 0; i < messages.length; i++) {
      container.appendChild(this._createBubble(messages[i]));
    }
  } else {
    var last = messages[messages.length - 1];
    var lastEl = container.lastElementChild;
    if (lastEl && lastEl.classList.contains('chat-msg')) {
      this._updateBubble(lastEl, last);
    }
  }

  this._scrollToBottom();
};

Aether.UI.prototype._clearBubbles = function(container) {
  var bubbles = container.querySelectorAll('.chat-msg');
  for (var i = 0; i < bubbles.length; i++) {
    bubbles[i].remove();
  }
};

Aether.UI.prototype._createBubble = function(msg) {
  var el = document.createElement('div');
  el.className = 'chat-msg ' + msg.role;
  el.dataset.id = msg.id;

  var roleName = msg.role === 'user' ? Aether.t('chat.you') : Aether.t('chat.aether');
  el.innerHTML =
    '<div class="msg-role">' + roleName + '</div>' +
    '<div class="msg-content">' + this._escapeHtml(msg.content) + '</div>';

  if (msg.status === 'streaming') el.classList.add('streaming');
  if (msg.status === 'error') el.classList.add('error');

  return el;
};

Aether.UI.prototype._updateBubble = function(el, msg) {
  var contentEl = el.querySelector('.msg-content');
  if (contentEl) contentEl.textContent = msg.content;

  el.classList.toggle('streaming', msg.status === 'streaming');
  el.classList.toggle('error', msg.status === 'error');
};

// ── Interrim Text (while listening) ─────────────

Aether.UI.prototype.showInterim = function(text) {
  this._removeInterim();
  if (!text) return;
  var el = document.createElement('div');
  el.className = 'interim-toast';
  el.id = 'interim-toast';
  el.textContent = text;
  document.body.appendChild(el);
};

Aether.UI.prototype._removeInterim = function() {
  var el = document.getElementById('interim-toast');
  if (el) el.remove();
};

// ── Error Toast ──────────────────────────────────

Aether.UI.prototype.showError = function(msg) {
  this._removeError();
  if (!msg) return;
  var el = document.createElement('div');
  el.className = 'error-toast';
  el.id = 'error-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(this._removeError.bind(this), 4000);
};

Aether.UI.prototype._removeError = function() {
  var el = document.getElementById('error-toast');
  if (el) el.remove();
};

// ── Settings Panel ───────────────────────────────

Aether.UI.prototype._bindSettings = function() {
  var self = this;

  // Toggle switching
  document.getElementById('toggle-streaming').addEventListener('click', function() {
    this.classList.toggle('on');
  });
  document.getElementById('toggle-continuous').addEventListener('click', function() {
    this.classList.toggle('on');
  });

  // Range displays
  document.getElementById('set-rate').addEventListener('input', function() {
    document.getElementById('rate-value').textContent = this.value + 'x';
  });
  document.getElementById('set-pitch').addEventListener('input', function() {
    document.getElementById('pitch-value').textContent = this.value;
  });

  // Language change (reload voices)
  document.getElementById('set-lang').addEventListener('change', function() {
    Aether.SETTINGS.lang = this.value;
    self._updateTexts();
    self._loadVoices();
  });

  // Theme change
  document.getElementById('set-theme').addEventListener('change', function() {
    Aether.applyTheme(this.value);
  });

  // Cancel
  document.getElementById('btn-cancel-settings').addEventListener('click', function() {
    self.hideSettings();
  });

  // Save
  document.getElementById('btn-save-settings').addEventListener('click', function() {
    self._saveSettings();
    self.hideSettings();
  });

  // Close on overlay click
  document.getElementById('settings-overlay').addEventListener('click', function(e) {
    if (e.target === this) self.hideSettings();
  });

  // Export close
  document.getElementById('btn-close-export').addEventListener('click', function() {
    document.getElementById('export-overlay').classList.add('hidden');
  });
  document.getElementById('export-overlay').addEventListener('click', function(e) {
    if (e.target === this) document.getElementById('export-overlay').classList.add('hidden');
  });
  document.getElementById('btn-copy-export').addEventListener('click', function() {
    var ta = document.getElementById('export-text');
    ta.select();
    document.execCommand('copy');
    this.textContent = Aether.t('settings.save');
    setTimeout(function() { document.getElementById('btn-copy-export').textContent = 'Copy'; }, 2000);
  });
};

Aether.UI.prototype.showSettings = function() {
  this._loadVoices();
  this._populateSettings();
  document.getElementById('settings-overlay').classList.remove('hidden');
};

Aether.UI.prototype.hideSettings = function() {
  document.getElementById('settings-overlay').classList.add('hidden');
};

Aether.UI.prototype._populateSettings = function() {
  var s = Aether.SETTINGS;
  document.getElementById('set-lang').value = s.lang;
  document.getElementById('set-theme').value = s.theme;
  document.getElementById('set-voice').value = s.voiceName;
  document.getElementById('set-rate').value = s.voiceRate;
  document.getElementById('rate-value').textContent = s.voiceRate + 'x';
  document.getElementById('set-pitch').value = s.voicePitch;
  document.getElementById('pitch-value').textContent = s.voicePitch;
  document.getElementById('set-apikey').value = s.apiKey;
  document.getElementById('set-prompt').value = s.systemPrompt;
  document.getElementById('toggle-streaming').classList.toggle('on', s.streamingEnabled);
  document.getElementById('toggle-continuous').classList.toggle('on', s.continuousListening);
};

Aether.UI.prototype._saveSettings = function() {
  var s = Aether.SETTINGS;
  s.lang = document.getElementById('set-lang').value;
  s.theme = document.getElementById('set-theme').value;
  s.voiceName = document.getElementById('set-voice').value;
  s.voiceRate = parseFloat(document.getElementById('set-rate').value);
  s.voicePitch = parseFloat(document.getElementById('set-pitch').value);
  s.apiKey = document.getElementById('set-apikey').value.trim();
  s.systemPrompt = document.getElementById('set-prompt').value.trim();
  s.streamingEnabled = document.getElementById('toggle-streaming').classList.contains('on');
  s.continuousListening = document.getElementById('toggle-continuous').classList.contains('on');

  Aether.saveSettings();
  Aether.applyTheme(s.theme);
  this._updateTexts();

  // Notify app of settings change if needed
  if (this.onSettingsChanged) this.onSettingsChanged();
};

Aether.UI.prototype._loadVoices = function() {
  // Need a speech synthesis instance to get voices
  var synth = window.speechSynthesis;
  if (!synth) return;

  // Trigger voice loading
  var voices = synth.getVoices();
  if (voices.length === 0) {
    // Chrome loads voices async — force a dummy utterance
    var u = new SpeechSynthesisUtterance('');
    synth.speak(u);
    setTimeout(this._loadVoices.bind(this), 200);
    return;
  }

  var lang = Aether.SETTINGS.lang === 'th' ? 'th' : 'en';
  var filtered = voices.filter(function(v) { return v.lang.indexOf(lang) === 0; });

  var select = document.getElementById('set-voice');
  select.innerHTML = '<option value="">Auto</option>';
  for (var i = 0; i < filtered.length; i++) {
    var opt = document.createElement('option');
    opt.value = filtered[i].name;
    opt.textContent = filtered[i].name + ' (' + filtered[i].lang + ')';
    if (filtered[i].name === Aether.SETTINGS.voiceName) opt.selected = true;
    select.appendChild(opt);
  }
};

// ── Export Dialog ────────────────────────────────

Aether.UI.prototype.showExport = function(text) {
  document.getElementById('export-text').value = text;
  document.getElementById('export-title').textContent = Aether.t('controls.export');
  document.getElementById('export-overlay').classList.remove('hidden');
};

// ── Text Updates (i18n) ─────────────────────────

Aether.UI.prototype._updateTexts = function() {
  document.getElementById('chat-empty').textContent = Aether.t('chat.empty');
  document.getElementById('orb-label').textContent = Aether.t('orb.idle');
  document.querySelector('.settings-title').textContent = Aether.t('settings.title');

  // Settings labels
  var labels = {
    'set-lang': 'lang', 'set-theme': 'theme', 'set-voice': 'voice',
    'set-rate': 'voiceRate', 'set-pitch': 'voicePitch', 'set-apikey': 'apiKey', 'set-prompt': 'systemPrompt'
  };
  for (var id in labels) {
    var el = document.querySelector('label[for="' + id + '"]');
    if (el) el.textContent = Aether.t('settings.' + labels[id]);
  }

  // Hints
  document.querySelector('#set-apikey + .setting-hint').textContent = Aether.t('settings.apiKeyHint');
  document.querySelector('#set-voice + .setting-hint').textContent = Aether.t('settings.voiceHint');

  // Toggle texts
  document.querySelector('#toggle-streaming').previousElementSibling.textContent = Aether.t('settings.streaming');
  document.querySelector('#toggle-continuous').previousElementSibling.textContent = Aether.t('settings.continuous');

  // Buttons
  document.getElementById('btn-save-settings').textContent = Aether.t('settings.save');
  document.getElementById('btn-cancel-settings').textContent = Aether.t('settings.cancel');
  document.getElementById('btn-close-export').textContent = Aether.t('settings.cancel');
};

// ── Helpers ──────────────────────────────────────

Aether.UI.prototype._scrollToBottom = function() {
  var area = document.getElementById('chat-area');
  if (area) {
    requestAnimationFrame(function() { area.scrollTop = area.scrollHeight; });
  }
};

Aether.UI.prototype._escapeHtml = function(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ── Text Input + File Attachment ─────────────────

Aether.UI.prototype._submitText = function() {
  var input = document.getElementById('text-input');
  var text = input.value.trim();
  var hasFile = !!this._attachedFile;

  if (!text && !hasFile) return;

  if (this._attachedFile) {
    // Read file and include in message
    this._readFileContent(this._attachedFile, function(fileContent) {
      var msg = text;
      if (fileContent) {
        msg += '\n\n[File: ' + this._attachedFile.name + ']\n' + fileContent;
      }
      this._clearInput();
      if (this.onTextSend) this.onTextSend(msg);
    }.bind(this));
  } else {
    this._clearInput();
    if (this.onTextSend) this.onTextSend(text);
  }
};

Aether.UI.prototype._clearInput = function() {
  document.getElementById('text-input').value = '';
  this._attachedFile = null;
  this._hideFilePreview();
  document.getElementById('file-input').value = '';
};

Aether.UI.prototype._showFilePreview = function(file) {
  var el = document.getElementById('file-preview');
  el.classList.remove('hidden');
  el.innerHTML = '📎 ' + file.name + ' <span class="remove-file" onclick="AetherApp.ui._clearInput()">✕</span>';
};

Aether.UI.prototype._hideFilePreview = function() {
  document.getElementById('file-preview').classList.add('hidden');
};

Aether.UI.prototype._readFileContent = function(file, callback) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var content = e.target.result;
    // Truncate to ~8000 chars to avoid token overflow
    if (content.length > 8000) {
      content = content.slice(0, 8000) + '\n... (truncated)';
    }
    callback(content);
  };
  reader.onerror = function() {
    callback(null);
  };
  reader.readAsText(file);
};

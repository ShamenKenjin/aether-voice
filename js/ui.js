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

  // File attachment (text + image + PDF)
  document.getElementById('btn-attach').addEventListener('click', function() {
    document.getElementById('file-input').click();
  });

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
    '<div class="msg-content">' + this._renderMarkdown(this._escapeHtml(msg.content)) + '</div>' +
    '<button class="msg-copy-btn" title="Copy" onclick="Aether.UI._copyMessage(this)">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
    '</button>';

  if (msg.status === 'streaming') el.classList.add('streaming');
  if (msg.status === 'error') el.classList.add('error');

  return el;
};

Aether.UI.prototype._updateBubble = function(el, msg) {
  var contentEl = el.querySelector('.msg-content');
  if (contentEl) {
    // Save cursor position for copy button
    contentEl.innerHTML = this._renderMarkdown(this._escapeHtml(msg.content));
  }

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
  document.getElementById('set-gemini-key').value = s.geminiKey || '';
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
  s.geminiKey = document.getElementById('set-gemini-key').value.trim();
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
    'set-rate': 'voiceRate', 'set-pitch': 'voicePitch', 'set-apikey': 'apiKey',
    'set-gemini-key': 'geminiKey', 'set-prompt': 'systemPrompt'
  };
  for (var id in labels) {
    var el = document.querySelector('label[for="' + id + '"]');
    if (el) el.textContent = Aether.t('settings.' + labels[id]);
  }

  // Hints
  document.querySelector('#set-apikey + .setting-hint').textContent = Aether.t('settings.apiKeyHint');
  document.querySelector('#set-gemini-key + .setting-hint').textContent = Aether.t('settings.geminiKeyHint');
  document.querySelector('#set-voice + .setting-hint').textContent = Aether.t('settings.voiceHint');

  // Toggle texts
  document.querySelector('#toggle-streaming').previousElementSibling.textContent = Aether.t('settings.streaming');
  document.querySelector('#toggle-continuous').previousElementSibling.textContent = Aether.t('settings.continuous');

  // Buttons
  document.getElementById('btn-save-settings').textContent = Aether.t('settings.save');
  document.getElementById('btn-cancel-settings').textContent = Aether.t('settings.cancel');
  document.getElementById('btn-close-export').textContent = Aether.t('settings.cancel');
};

// ── Markdown Rendering ────────────────────────────

Aether.UI.prototype._renderMarkdown = function(escapedText) {
  if (!escapedText) return '';

  var html = escapedText;

  // Code blocks with backticks: ```code```
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m, lang, code) {
    return '<pre><code class="' + (lang || '') + '">' + code.trim() + '</code></pre>';
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Unordered list items: - item or * item
  html = html.replace(/(^|\n)[-*] (.+?)(?=\n|$)/g, function(m, prefix, item) {
    return prefix + '<li>' + item + '</li>';
  });
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered list: 1. item
  html = html.replace(/(^|\n)(\d+)\. (.+?)(?=\n|$)/g, function(m, prefix, num, item) {
    return prefix + '<li>' + item + '</li>';
  });

  // Line breaks (double newline → paragraph break, single → <br>)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph if not already in a block element
  if (!html.match(/^<(pre|ul|ol|li|p)/)) {
    html = '<p>' + html + '</p>';
  }

  return html;
};

// ── Copy Message (static, called from onclick) ─────

Aether.UI._copyMessage = function(btn) {
  var bubble = btn.closest('.chat-msg');
  if (!bubble) return;

  var contentEl = bubble.querySelector('.msg-content');
  if (!contentEl) return;

  var text = contentEl.textContent || '';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      btn.classList.add('copied');
      setTimeout(function() { btn.classList.remove('copied'); }, 1500);
    });
  } else {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.classList.add('copied');
    setTimeout(function() { btn.classList.remove('copied'); }, 1500);
  }
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
    var file = this._attachedFile;
    var isImage = file.type.match(/^image\//);
    var isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isImage) {
      // Send image for vision analysis
      var capturedText = text;
      var capturedFile = file;
      this._clearInput();
      if (this.onVisionSend) this.onVisionSend({ text: capturedText, file: capturedFile, type: 'image' });
    } else if (isPdf) {
      // Read PDF via vision module
      var capturedPdfText = text;
      var capturedPdfFile = file;
      this._clearInput();
      if (this.onVisionSend) this.onVisionSend({ text: capturedPdfText, file: capturedPdfFile, type: 'pdf' });
    } else {
      // Read file content (text files)
      this._readFileContent(file, function(fileContent) {
        var msg = text;
        if (fileContent) {
          msg += '\n\n[File: ' + file.name + ']\n' + fileContent;
        }
        this._clearInput();
        if (this.onTextSend) this.onTextSend(msg);
      }.bind(this));
    }
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

  var isImage = file.type.match(/^image\//);
  var isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isImage) {
    var imgUrl = URL.createObjectURL(file);
    el.innerHTML = '<img src="' + imgUrl + '" class="attach-thumb" onload="this.style.opacity=1">'
      + '<span class="attach-name">' + this._escapeHtml(file.name) + '</span>'
      + '<span class="remove-file" onclick="AetherApp.ui._clearInput()">✕</span>';
  } else if (isPdf) {
    el.innerHTML = '📄 ' + file.name + ' <span class="remove-file" onclick="AetherApp.ui._clearInput()">✕</span>';
  } else {
    el.innerHTML = '📎 ' + file.name + ' <span class="remove-file" onclick="AetherApp.ui._clearInput()">✕</span>';
  }
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

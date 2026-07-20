// Aether — ui.js (HUD Dashboard edition)
// Chat bubbles, HUD panels, settings, clock, stats
var Aether = window.Aether || {};

Aether.UI = function() {
  this.orb = null;
  this.onMicPress = null;
  this.onMicRelease = null;
  this.onClear = null;
  this.onNewChat = null;
  this.sessionStart = Date.now();
  this.lastResponseTime = 0;
  this._attachedFile = null;
  this._init();
};

Aether.UI.prototype._init = function() {
  this._bindControls();
  this._bindSettings();
  this._startClock();
  this._updateTexts();
};

// ── Control Bindings ─────────────────────────────

Aether.UI.prototype._bindControls = function() {
  var self = this;

  // Mic button
  var micBtn = document.getElementById('btn-mic');
  micBtn.addEventListener('mousedown', function(e) {
    e.preventDefault(); if (self.onMicPress) self.onMicPress();
  });
  micBtn.addEventListener('mouseup', function(e) {
    e.preventDefault(); if (self.onMicRelease) self.onMicRelease();
  });
  micBtn.addEventListener('mouseleave', function(e) {
    if (micBtn.classList.contains('listening') || micBtn.classList.contains('error')) {
      if (self.onMicRelease) self.onMicRelease();
    }
  });
  micBtn.addEventListener('touchstart', function(e) {
    e.preventDefault(); if (self.onMicPress) self.onMicPress();
  });
  micBtn.addEventListener('touchend', function(e) {
    e.preventDefault(); if (self.onMicRelease) self.onMicRelease();
  });

  // Settings
  document.getElementById('btn-settings').addEventListener('click', function() {
    self.showSettings();
  });

  // New chat (right panel)
  var newBtn = document.getElementById('btn-new-chat');
  if (newBtn) newBtn.addEventListener('click', function() { if (self.onNewChat) self.onNewChat(); });

  // Clear chat
  var clearBtn = document.getElementById('btn-clear-chat');
  if (clearBtn) clearBtn.addEventListener('click', function() { if (self.onClear) self.onClear(); });

  // Text input
  var textInput = document.getElementById('text-input');
  textInput.placeholder = Aether.t('chat.placeholder');
  textInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._submitText(); }
  });

  document.getElementById('btn-send').addEventListener('click', function() { self._submitText(); });

  // File attach
  document.getElementById('btn-attach').addEventListener('click', function() {
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    self._attachedFile = file;
    self._showFilePreview(file);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); self._submitText(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      if (self.onMicPress) self.onMicPress();
      setTimeout(function() { if (self.onMicRelease) self.onMicRelease(); }, 50);
    }
    if (e.key === 'Escape') { self.hideSettings(); }
  });
};

// ── Mic button states ────────────────────────────

Aether.UI.prototype.setMicState = function(state) {
  var btn = document.getElementById('btn-mic');
  btn.className = 'mic-btn';
  if (state === 'listening') btn.classList.add('listening');
  if (state === 'error') btn.classList.add('error');
};

// ── Orb state ────────────────────────────────────

Aether.UI.prototype.setOrbState = function(state) {
  if (this.orb) this.orb.setState(state);
  var label = document.getElementById('orb-label');
  label.textContent = state.toUpperCase();

  // Update top bar status
  var dot = document.getElementById('status-dot');
  var txt = document.getElementById('status-text');
  dot.className = 'status-dot';
  switch (state) {
    case 'idle': txt.textContent = 'READY'; break;
    case 'listening': txt.textContent = 'LISTENING'; dot.classList.add('warn'); break;
    case 'thinking': txt.textContent = 'PROCESSING'; break;
    case 'speaking': txt.textContent = 'SPEAKING'; break;
    case 'error': txt.textContent = 'ERROR'; dot.classList.add('err'); break;
  }
};

// ── Chat Rendering ───────────────────────────────

Aether.UI.prototype.renderMessages = function(messages) {
  var container = document.getElementById('chat-messages');
  var empty = document.getElementById('chat-empty');

  if (!messages || messages.length === 0) {
    this._clearBubbles(container);
    if (empty) { empty.style.display = 'flex'; empty.textContent = Aether.t('chat.empty'); }
    this._updateConvLog([]);
    return;
  }

  if (empty) empty.style.display = 'none';

  var currentCount = container.querySelectorAll('.chat-msg').length;
  if (currentCount !== messages.length || currentCount === 0) {
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
  this._updateConvLog(messages);
  this._updateStats(messages);
};

Aether.UI.prototype._clearBubbles = function(container) {
  var bubbles = container.querySelectorAll('.chat-msg');
  for (var i = 0; i < bubbles.length; i++) bubbles[i].remove();
};

Aether.UI.prototype._createBubble = function(msg) {
  var el = document.createElement('div');
  el.className = 'chat-msg ' + msg.role;
  el.dataset.id = msg.id;
  var roleName = msg.role === 'user' ? Aether.t('chat.you') : Aether.t('chat.aether');
  el.innerHTML =
    '<div class="msg-role">' + roleName + '</div>' +
    '<div class="msg-content">' + this._renderMarkdown(this._escapeHtml(msg.content)) + '</div>' +
    '<div class="typing-dots"><span></span><span></span><span></span></div>' +
    '<button class="msg-edit-btn" title="Edit" onclick="Aether.UI._editMessage(this)">' +
      '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
    '</button>' +
    '<button class="msg-copy-btn" title="Copy" onclick="Aether.UI._copyMessage(this)">' +
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>' +
    '</button>';
  if (msg.status === 'streaming') el.classList.add('streaming');
  if (msg.status === 'error') el.classList.add('error');
  var dots = el.querySelector('.typing-dots');
  if (dots) dots.style.display = (msg.status === 'streaming' && !msg.content) ? 'flex' : 'none';
  return el;
};

Aether.UI.prototype._updateBubble = function(el, msg) {
  var contentEl = el.querySelector('.msg-content');
  if (contentEl) contentEl.innerHTML = this._renderMarkdown(this._escapeHtml(msg.content));
  el.classList.toggle('streaming', msg.status === 'streaming');
  el.classList.toggle('error', msg.status === 'error');
  var dots = el.querySelector('.typing-dots');
  if (dots) dots.style.display = (msg.status === 'streaming' && !msg.content) ? 'flex' : 'none';
};

// ── Conversation Log (right panel) ───────────────

Aether.UI.prototype._updateConvLog = function(messages) {
  var container = document.getElementById('conv-log');
  if (!container) return;
  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="log-placeholder">No messages yet</div>';
    return;
  }
  // Show last 8 messages
  var recent = messages.slice(-8);
  var html = '';
  for (var i = 0; i < recent.length; i++) {
    var m = recent[i];
    var role = m.role === 'user' ? 'YOU' : 'AETHER';
    var text = m.content.replace(/\n/g, ' ').substring(0, 60);
    html += '<div class="log-item"><div class="log-role">' + role + '</div><div class="log-text">' + this._escapeHtml(text) + '</div></div>';
  }
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
};

// ── Left Panel Stats ─────────────────────────────

Aether.UI.prototype._updateStats = function(messages) {
  // Model
  var provider = Aether.SETTINGS.llmProvider || 'deepseek';
  var el = document.getElementById('stat-model');
  if (el) el.textContent = provider.toUpperCase();

  // Messages
  el = document.getElementById('stat-messages');
  if (el) el.textContent = messages ? messages.length : 0;

  // Session time
  el = document.getElementById('stat-session');
  if (el) el.textContent = this._formatDuration((Date.now() - this.sessionStart) / 1000);

  // Token stats from LLM
  if (AetherApp && AetherApp.llm) {
    var u = AetherApp.llm.tokenUsage;
    el = document.getElementById('stat-tokens-in');
    if (el) el.textContent = u.input.toLocaleString();
    el = document.getElementById('stat-tokens-out');
    if (el) el.textContent = u.output.toLocaleString();
    el = document.getElementById('stat-cost');
    if (el) el.textContent = '$' + u.cost.toFixed(4);

    // Token bar
    var total = u.input + u.output;
    el = document.getElementById('stat-bar-tokens');
    if (el) el.style.width = Math.min(100, (total / 10000) * 100) + '%';

    // Response time
    el = document.getElementById('stat-resptime');
    if (el) el.textContent = this.lastResponseTime ? (this.lastResponseTime / 1000).toFixed(2) + 's' : '--';
  }
};

// ── Clock ────────────────────────────────────────

Aether.UI.prototype._startClock = function() {
  var self = this;
  var update = function() {
    var now = new Date();
    var t = now.toTimeString().split(' ')[0];
    var d = now.toDateString();
    var el = document.getElementById('hud-clock');
    if (el) el.textContent = t;
    el = document.getElementById('hud-date');
    if (el) el.textContent = d;

    // Also update session time every 10s
    if (now.getSeconds() % 10 === 0) {
      el = document.getElementById('stat-session');
      if (el) el.textContent = self._formatDuration((now - self.sessionStart) / 1000);
    }
  };
  update();
  setInterval(update, 1000);
};

Aether.UI.prototype._formatDuration = function(sec) {
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
};

// ── Token counter (called from app.js) ────────────

Aether.UI.prototype.updateTokenCounter = function() {
  this._updateStats(AetherApp ? AetherApp.conversation.messages : []);
};

Aether.UI.prototype.setLastResponseTime = function(ms) {
  this.lastResponseTime = ms;
};

// ── Interrim / Error ─────────────────────────────

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

  document.getElementById('toggle-streaming').addEventListener('click', function() { this.classList.toggle('on'); });
  document.getElementById('toggle-continuous').addEventListener('click', function() { this.classList.toggle('on'); });
  document.getElementById('toggle-wakeword').addEventListener('click', function() { this.classList.toggle('on'); });

  document.getElementById('set-rate').addEventListener('input', function() {
    document.getElementById('rate-value').textContent = this.value + 'x';
  });
  document.getElementById('set-pitch').addEventListener('input', function() {
    var el = document.getElementById('pitch-value');
    if (el) el.textContent = this.value;
  });

  document.getElementById('set-lang').addEventListener('change', function() {
    Aether.SETTINGS.lang = this.value;
    self._updateTexts();
    self._loadVoices();
  });

  document.getElementById('set-theme').addEventListener('change', function() {
    Aether.applyTheme(this.value);
  });

  document.getElementById('btn-cancel-settings').addEventListener('click', function() { self.hideSettings(); });
  document.getElementById('btn-save-settings').addEventListener('click', function() {
    self._saveSettings(); self.hideSettings();
  });

  document.getElementById('settings-overlay').addEventListener('click', function(e) {
    if (e.target === this) self.hideSettings();
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
  document.getElementById('set-provider').value = s.llmProvider || 'deepseek';
  document.getElementById('set-voice').value = s.voiceName;
  document.getElementById('set-rate').value = s.voiceRate;
  document.getElementById('rate-value').textContent = s.voiceRate + 'x';
  document.getElementById('set-apikey').value = s.apiKey;
  document.getElementById('set-gemini-key').value = s.geminiKey || '';
  document.getElementById('set-prompt').value = s.systemPrompt;
  document.getElementById('toggle-streaming').classList.toggle('on', s.streamingEnabled);
  document.getElementById('toggle-continuous').classList.toggle('on', s.continuousListening);
  document.getElementById('toggle-wakeword').classList.toggle('on', s.wakeWordEnabled);
};

Aether.UI.prototype._saveSettings = function() {
  var s = Aether.SETTINGS;
  s.lang = document.getElementById('set-lang').value;
  s.llmProvider = document.getElementById('set-provider').value;
  s.voiceName = document.getElementById('set-voice').value;
  s.voiceRate = parseFloat(document.getElementById('set-rate').value);
  s.apiKey = document.getElementById('set-apikey').value.trim();
  s.geminiKey = document.getElementById('set-gemini-key').value.trim();
  s.systemPrompt = document.getElementById('set-prompt').value.trim();
  s.streamingEnabled = document.getElementById('toggle-streaming').classList.contains('on');
  s.continuousListening = document.getElementById('toggle-continuous').classList.contains('on');
  s.wakeWordEnabled = document.getElementById('toggle-wakeword').classList.contains('on');
  Aether.saveSettings();
  this._updateTexts();
  if (this.onSettingsChanged) this.onSettingsChanged();
};

Aether.UI.prototype._loadVoices = function() {
  var synth = window.speechSynthesis;
  if (!synth) return;
  var voices = synth.getVoices();
  if (voices.length === 0) {
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

// ── Text Updates (i18n) ──────────────────────────

Aether.UI.prototype._updateTexts = function() {
  var empty = document.getElementById('chat-empty');
  if (empty) empty.textContent = Aether.t('chat.empty');
  var label = document.getElementById('orb-label');
  if (label) label.textContent = 'READY';
  var input = document.getElementById('text-input');
  if (input) input.placeholder = Aether.t('chat.placeholder');
};

// ── Helpers ──────────────────────────────────────

Aether.UI.prototype._scrollToBottom = function() {
  var area = document.getElementById('chat-area');
  if (area) requestAnimationFrame(function() { area.scrollTop = area.scrollHeight; });
};

Aether.UI.prototype._escapeHtml = function(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// ── Markdown Rendering ────────────────────────────

Aether.UI.prototype._renderMarkdown = function(escapedText) {
  if (!escapedText) return '';
  var html = escapedText;
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, function(m, lang, code) {
    return '<pre><code>' + code.trim() + '</code></pre>';
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/(^|\n)[-*] (.+?)(?=\n|$)/g, function(m, prefix, item) { return prefix + '<li>' + item + '</li>'; });
  html = html.replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  if (!html.match(/^<(pre|ul|ol|li|p)/)) html = '<p>' + html + '</p>';
  return html;
};

// ── Copy Message (static) ─────────────────────────

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
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    btn.classList.add('copied');
    setTimeout(function() { btn.classList.remove('copied'); }, 1500);
  }
};

// ── Edit Message (static, conversation branching) ──

Aether.UI._editMessage = function(btn) {
  var bubble = btn.closest('.chat-msg');
  if (!bubble) return;
  var contentEl = bubble.querySelector('.msg-content');
  if (!contentEl) return;
  var originalText = contentEl.textContent || '';
  var msgId = bubble.dataset.id;
  contentEl.innerHTML = '';
  var input = document.createElement('textarea');
  input.className = 'msg-edit-input';
  input.value = originalText;
  input.rows = Math.min(6, Math.max(2, Math.ceil(originalText.length / 50)));
  contentEl.appendChild(input); input.focus();

  function submitEdit() {
    var newText = input.value.trim();
    if (!newText || newText === originalText) {
      contentEl.innerHTML = AetherApp.ui._renderMarkdown(AetherApp.ui._escapeHtml(originalText));
      return;
    }
    if (AetherApp && AetherApp._branchConversation) AetherApp._branchConversation(msgId, newText);
  }
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); }
    if (e.key === 'Escape') contentEl.innerHTML = AetherApp.ui._renderMarkdown(AetherApp.ui._escapeHtml(originalText));
  });
  input.addEventListener('blur', function() {
    setTimeout(function() {
      if (contentEl.querySelector('.msg-edit-input'))
        contentEl.innerHTML = AetherApp.ui._renderMarkdown(AetherApp.ui._escapeHtml(originalText));
    }, 200);
  });
};

// ── Text Input + File ─────────────────────────────

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
      var ct = text, cf = file; this._clearInput();
      if (this.onVisionSend) this.onVisionSend({ text: ct, file: cf, type: 'image' });
    } else if (isPdf) {
      var pt = text, pf = file; this._clearInput();
      if (this.onVisionSend) this.onVisionSend({ text: pt, file: pf, type: 'pdf' });
    } else {
      this._readFileContent(file, function(fc) {
        var msg = text;
        if (fc) msg += '\n\n[File: ' + file.name + ']\n' + fc;
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
  this._attachedFile = null; this._hideFilePreview();
  document.getElementById('file-input').value = '';
};

Aether.UI.prototype._showFilePreview = function(file) {
  var el = document.getElementById('file-preview');
  el.classList.remove('hidden');
  var isImage = file.type.match(/^image\//);
  var isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isImage) {
    var imgUrl = URL.createObjectURL(file);
    el.innerHTML = '<img src="' + imgUrl + '" class="attach-thumb" onload="this.style.opacity=1"><span class="attach-name">' + this._escapeHtml(file.name) + '</span><span class="remove-file" onclick="AetherApp.ui._clearInput()">✕</span>';
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
    if (content.length > 8000) content = content.slice(0, 8000) + '\n... (truncated)';
    callback(content);
  };
  reader.onerror = function() { callback(null); };
  reader.readAsText(file);
};

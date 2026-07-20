// Aether — app.js
// Main orchestration: wires speech → LLM → speech pipeline
var Aether = window.Aether || {};

Aether.App = function() {
  this.ui = null;
  this.orb = null;
  this.speechIn = null;
  this.speechOut = null;
  this.llm = null;
  this.conversation = null;
  this.vision = null;
  this.sfx = null;
  this.wakeword = null;

  this.state = 'idle'; // idle | listening | thinking | speaking | error
  this.isMicPressed = false;
  this.lastInterimLength = 0;

  this._init();
};

// ── Bootstrap ────────────────────────────────────

Aether.App.prototype._init = function() {
  // Init modules (order matters)
  this.ui = new Aether.UI();
  this.orb = new Aether.Orb('orb-canvas');
  this.speechIn = new Aether.SpeechInput();
  this.speechOut = new Aether.SpeechOutput();
  this.llm = new Aether.LLM();
  this.conversation = new Aether.Conversation();
  this.vision = new Aether.Vision();
  this.sfx = new Aether.SFX();
  this.wakeword = new Aether.WakeWord();

  // Link orb to UI
  this.ui.orb = this.orb;

  // Load saved conversation
  this.conversation.load();

  // Wire events
  this._wireSpeechInput();
  this._wireSpeechOutput();
  this._wireUI();
  this._wireSettingsChange();

  // Initial render
  this.ui.renderMessages(this.conversation.messages);
  this.ui.setOrbState('idle');

  // Wire wake word
  var self = this;
  if (this.wakeword) {
    this.wakeword.onWake = function() {
      // Wake word detected — start listening (like mic press)
      if (self.state === 'speaking') self.speechOut.stop();
      self._startListening();
      // Auto-release after speech result
    };
    // Activate if setting is on
    if (Aether.SETTINGS.wakeWordEnabled) {
      this.wakeword.activate();
    }
  }

  // Check browser support
  if (!this.speechIn.isSupported) {
    this.ui.showError(Aether.t('errors.noSpeech'));
  }
};

// ── Wire Speech Input ────────────────────────────

Aether.App.prototype._wireSpeechInput = function() {
  var self = this;

  this.speechIn.onResult = function(text) {
    if (!text.trim()) return;
    self.ui._removeInterim();
    self._onUserSpeech(text);
  };

  this.speechIn.onInterim = function(text) {
    self.ui.showInterim(text);
    // Feed reactivity to orb
    if (self.orb && text.length > 0) {
      self.orb.pulse(Math.min(1, text.length / 30));
    }
  };

  this.speechIn.onError = function(msg) {
    self.ui._removeInterim();
    self.ui.showError(msg);
    self.setState('error');
    self.ui.setMicState('error');
    self.isMicPressed = false;
  };

  this.speechIn.onStateChange = function(isListening) {
    // Handled via mic press/release
  };
};

// ── Wire Speech Output ───────────────────────────

Aether.App.prototype._wireSpeechOutput = function() {
  var self = this;

  this.speechOut.onStart = function() {
    self.setState('speaking');
  };

  this.speechOut.onEnd = function() {
    self.setState('idle');

    // Continuous mode: auto-restart listening
    if (Aether.SETTINGS.continuousListening) {
      setTimeout(function() {
        self._startListening();
      }, 600);
    }
  };
};

// ── Wire UI Events ───────────────────────────────

Aether.App.prototype._wireUI = function() {
  var self = this;

  this.ui.onMicPress = function() {
    if (self.state === 'speaking') {
      // Interrupt TTS
      self.speechOut.stop();
    }
    self._startListening();
  };

  this.ui.onMicRelease = function() {
    self._stopListening();
  };

  this.ui.onClear = function() {
    self._clearConversation();
  };

  // Text input — same pipeline as voice
  this.ui.onTextSend = function(text) {
    self._onUserSpeech(text);
  };

  // Vision input (image/PDF)
  this.ui.onVisionSend = function(payload) {
    self._onVisionSubmit(payload);
  };
};

Aether.App.prototype._wireSettingsChange = function() {
  var self = this;
  this.ui.onSettingsChanged = function() {
    // Reload voices if lang changed
    self.ui._loadVoices();
    // Update orb label
    self.ui.setOrbState(self.state);
    // Handle wake word activation
    self._handleWakeWordSetting();
  };
};

Aether.App.prototype._handleWakeWordSetting = function() {
  if (!this.wakeword) return;
  if (Aether.SETTINGS.wakeWordEnabled) {
    this.wakeword.activate();
  } else {
    this.wakeword.deactivate();
  }
};

// ── Listening Flow ───────────────────────────────

Aether.App.prototype._startListening = function() {
  if (this.state === 'thinking') return; // Can't interrupt thinking

  this.isMicPressed = true;
  this.lastInterimLength = 0;
  this.speechIn.start();
  this.setState('listening');
  this.ui.setMicState('listening');
  if (this.sfx) this.sfx.micClick();
};

Aether.App.prototype._stopListening = function() {
  this.isMicPressed = false;
  this.speechIn.stop();
  this.ui._removeInterim();

  // If we were listening and got no text, go back to idle
  if (this.state === 'listening') {
    this.setState('idle');
    this.ui.setMicState('');
  }
};

// ── Core Pipeline ────────────────────────────────

Aether.App.prototype._onVisionSubmit = function(payload) {
  var self = this;

  // Show user message in chat
  var userText = payload.text || '';
  var fileLabel = payload.type === 'image'
    ? '🖼 [Image: ' + payload.file.name + ']'
    : '📄 [PDF: ' + payload.file.name + ']';

  var displayText = userText || fileLabel;
  if (userText) displayText = fileLabel + ' ' + userText;

  this.conversation.addMessage('user', displayText, 'complete');
  this.ui.renderMessages(this.conversation.messages);
  if (this.sfx) this.sfx.sendWhoosh();

  this.setState('thinking');

  // Add placeholder for assistant
  var assistantMsg = this.conversation.addMessage('assistant', '', 'streaming');
  this.ui.renderMessages(this.conversation.messages);

  // Analyze file
  var analyzePromise;
  if (payload.type === 'image') {
    analyzePromise = this.vision.analyzeImage(payload.file);
  } else if (payload.type === 'pdf') {
    analyzePromise = this.vision.extractPdfText(payload.file);
  } else {
    analyzePromise = Promise.reject('Unknown file type');
  }

  analyzePromise.then(function(description) {
    // Build the final message for LLM
    var fullPrompt = '';
    if (payload.type === 'image') {
      fullPrompt = 'I am sending you an image described by a vision AI. Here is the description:\n\n--- IMAGE DESCRIPTION ---\n' + description + '\n--- END ---\n\n';
    } else {
      fullPrompt = 'I am sending you a PDF document. Here is the extracted text:\n\n--- PDF CONTENT ---\n' + description + '\n--- END ---\n\n';
    }
    if (userText) {
      fullPrompt += 'My question: ' + userText;
    } else {
      fullPrompt += 'Please analyze this for me.';
    }

    // Add system-level context message for LLM
    // We send the full prompt as user message to LLM
    self._sendToLLM(fullPrompt, assistantMsg);
  }).catch(function(err) {
    assistantMsg.content = '❌ ' + (typeof err === 'string' ? err : 'Failed to analyze file');
    assistantMsg.status = 'error';
    self.conversation._save();
    self.ui.renderMessages(self.conversation.messages);
    self.setState('error');
    self.ui.showError(typeof err === 'string' ? err : 'File analysis failed');
  });
};

// ── LLM Send (shared by text and vision) ─────────

Aether.App.prototype._sendToLLM = function(promptText, assistantMsg) {
  var self = this;

  // Prepare messages: system prompt managed by llm.js itself
  // But we need to include recent conversation context
  // For vision analysis, we just send the vision description as a fresh user message
  var messages = [{ role: 'user', content: promptText }];

  this.llm.send(messages, {
    streaming: Aether.SETTINGS.streamingEnabled,
    onToken: function(token, fullContent) {
      assistantMsg.content = fullContent;
      assistantMsg.status = 'streaming';
      self.ui.renderMessages(self.conversation.messages);

      if (self.orb && self.state === 'thinking') {
        self.orb.pulse(0.3 + Math.random() * 0.3);
      }
    },
    onComplete: function(fullContent) {
      assistantMsg.content = fullContent;
      assistantMsg.status = 'complete';
      self.conversation._save();
      self.ui.renderMessages(self.conversation.messages);

      if (self.sfx) self.sfx.receiveChime();
      self._speakResponse(fullContent);
      self.ui.updateTokenCounter();
    },
    onError: function(error) {
      assistantMsg.content = error;
      assistantMsg.status = 'error';
      self.conversation._save();
      self.ui.renderMessages(self.conversation.messages);
      self.setState('error');
      self.ui.showError(error);
      if (self.sfx) self.sfx.errorBuzz();
      self.ui.updateTokenCounter();
    }
  });
};

Aether.App.prototype._onUserSpeech = function(text) {
  var self = this;

  // Add user message
  this.conversation.addMessage('user', text, 'complete');
  this.ui.renderMessages(this.conversation.messages);
  if (this.sfx) this.sfx.sendWhoosh();

  // Don't auto-stop mic in continuous mode
  if (!Aether.SETTINGS.continuousListening) {
    this.speechIn.stop();
    this.ui.setMicState('');
  }

  // Transition to thinking
  this.setState('thinking');

  // Add placeholder assistant message for streaming
  var assistantMsg = this.conversation.addMessage('assistant', '', 'streaming');
  this.ui.renderMessages(this.conversation.messages);

  // Send to LLM
  var messages = this.conversation.getMessagesForLLM();
  // Remove the empty assistant message from what we send
  var sendMessages = messages.slice(0, -1);

  this.llm.send(sendMessages, {
    streaming: Aether.SETTINGS.streamingEnabled,
    onToken: function(token, fullContent) {
      assistantMsg.content = fullContent;
      assistantMsg.status = 'streaming';
      self.ui.renderMessages(self.conversation.messages);

      // Pulse orb during streaming
      if (self.orb && self.state === 'thinking') {
        self.orb.pulse(0.3 + Math.random() * 0.3);
      }
    },
    onComplete: function(fullContent) {
      assistantMsg.content = fullContent;
      assistantMsg.status = 'complete';
      self.conversation._save();
      self.ui.renderMessages(self.conversation.messages);

      if (self.sfx) self.sfx.receiveChime();
      // Speak the response
      self._speakResponse(fullContent);
    },
    onError: function(error) {
      assistantMsg.content = error;
      assistantMsg.status = 'error';
      self.conversation._save();
      self.ui.renderMessages(self.conversation.messages);
      self.setState('error');
      self.ui.showError(error);
      if (self.sfx) self.sfx.errorBuzz();
    }
  });
};

// ── TTS Output ───────────────────────────────────

Aether.App.prototype._speakResponse = function(text) {
  if (!text || !this.speechOut.isSupported) {
    this.setState('idle');
    return;
  }
  this.speechOut.speak(text);
};

// ── State Management ─────────────────────────────

Aether.App.prototype.setState = function(state) {
  this.state = state;
  this.ui.setOrbState(state);
};

// ── Conversation Management ──────────────────────

Aether.App.prototype._clearConversation = function() {
  this.llm.abort();
  this.speechOut.stop();
  this.speechIn.stop();
  this.conversation.clear();
  this.ui.renderMessages(this.conversation.messages);
  this.setState('idle');
  this.ui.setMicState('');
  this.isMicPressed = false;
};

Aether.App.prototype._loadConversation = function(id) {
  // Save current first
  // Load conversation from localStorage
  try {
    var raw = localStorage.getItem('aether_conv_' + id);
    if (!raw) {
      // Try to load main conversation
      raw = localStorage.getItem('aether_conversation');
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || parsed.id !== id) return;
    } else {
      var parsed = JSON.parse(raw);
    }
    if (!parsed || !parsed.messages) return;

    // Clear current state
    this.llm.abort();
    this.speechOut.stop();
    this.speechIn.stop();

    // Load into conversation
    this.conversation.id = parsed.id;
    this.conversation.messages = parsed.messages;
    this.conversation.createdAt = parsed.createdAt || Date.now();
    this.conversation.updatedAt = parsed.updatedAt || Date.now();
    this.conversation._save();

    this.ui.renderMessages(this.conversation.messages);
    this.setState('idle');
    this.ui.setMicState('');
    this.isMicPressed = false;
  } catch(e) {
    this.ui.showError('Failed to load conversation');
  }
};

Aether.App.prototype._branchConversation = function(msgId, newText) {
  // Find the message index
  var idx = -1;
  for (var i = 0; i < this.conversation.messages.length; i++) {
    if (this.conversation.messages[i].id === msgId) { idx = i; break; }
  }
  if (idx === -1 || this.conversation.messages[idx].role !== 'user') return;

  // Update user message
  this.conversation.messages[idx].content = newText;
  this.conversation.messages[idx].status = 'complete';

  // Truncate all messages after this one
  this.conversation.messages = this.conversation.messages.slice(0, idx + 1);
  this.conversation._save();
  this.ui.renderMessages(this.conversation.messages);

  // Re-send to LLM
  var self = this;
  this.setState('thinking');

  var assistantMsg = this.conversation.addMessage('assistant', '', 'streaming');
  this.ui.renderMessages(this.conversation.messages);

  if (this.sfx) this.sfx.sendWhoosh();

  var messages = this.conversation.getMessagesForLLM();
  var sendMessages = messages.slice(0, -1);

  this.llm.send(sendMessages, {
    streaming: Aether.SETTINGS.streamingEnabled,
    onToken: function(token, fullContent) {
      assistantMsg.content = fullContent;
      assistantMsg.status = 'streaming';
      self.ui.renderMessages(self.conversation.messages);
      if (self.orb && self.state === 'thinking') {
        self.orb.pulse(0.3 + Math.random() * 0.3);
      }
    },
    onComplete: function(fullContent) {
      assistantMsg.content = fullContent;
      assistantMsg.status = 'complete';
      self.conversation._save();
      self.ui.renderMessages(self.conversation.messages);
      self.ui.updateTokenCounter();
      if (self.sfx) self.sfx.receiveChime();
      self._speakResponse(fullContent);
    },
    onError: function(error) {
      assistantMsg.content = error;
      assistantMsg.status = 'error';
      self.conversation._save();
      self.ui.renderMessages(self.conversation.messages);
      self.ui.updateTokenCounter();
      self.setState('error');
      self.ui.showError(error);
      if (self.sfx) self.sfx.errorBuzz();
    }
  });
};

// ── Bootstrap ────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  window.AetherApp = new Aether.App();
});

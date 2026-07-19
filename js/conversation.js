// Aether — conversation.js
// Conversation state, message history, localStorage persistence
var Aether = window.Aether || {};

Aether.Conversation = function() {
  this.id = this._uuid();
  this.messages = []; // [{ id, role, content, timestamp, status }]
  this.createdAt = Date.now();
  this.updatedAt = Date.now();
  this._loaded = false;
};

// ── Message CRUD ─────────────────────────────────

Aether.Conversation.prototype.addMessage = function(role, content, status) {
  status = status || 'complete';
  var msg = {
    id: this._uuid(),
    role: role,        // 'user' | 'assistant' | 'system'
    content: content,
    timestamp: Date.now(),
    status: status     // 'complete' | 'streaming' | 'error'
  };
  this.messages.push(msg);
  this.updatedAt = Date.now();
  this._save();
  return msg;
};

Aether.Conversation.prototype.updateLastMessage = function(content, status) {
  if (this.messages.length === 0) return null;
  var msg = this.messages[this.messages.length - 1];
  msg.content = content;
  if (status) msg.status = status;
  this.updatedAt = Date.now();
  this._save();
  return msg;
};

Aether.Conversation.prototype.getLastMessage = function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
};

// ── History Management ───────────────────────────

Aether.Conversation.prototype.clear = function() {
  this.messages = [];
  this.id = this._uuid();
  this.createdAt = Date.now();
  this.updatedAt = Date.now();
  this._save();
};

Aether.Conversation.prototype.getMessagesForLLM = function() {
  // Convert to LLM API format (system prompt handled by llm.js)
  return this.messages.map(function(m) {
    return { role: m.role, content: m.content };
  });
};

Aether.Conversation.prototype.getMessageCount = function() {
  return this.messages.length;
};

// ── Export ──────────────────────────────────────

Aether.Conversation.prototype.exportText = function() {
  var lines = [];
  lines.push('=== Aether Conversation ===');
  lines.push('Date: ' + new Date(this.createdAt).toLocaleString());
  lines.push('');

  for (var i = 0; i < this.messages.length; i++) {
    var m = this.messages[i];
    var label = m.role === 'user' ? 'You' : 'Aether';
    lines.push(label + ': ' + m.content);
    lines.push('');
  }

  return lines.join('\n');
};

Aether.Conversation.prototype.exportJSON = function() {
  return {
    id: this.id,
    messages: this.messages,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// ── Persistence (localStorage) ───────────────────

Aether.Conversation.prototype._save = function() {
  try {
    var data = JSON.stringify({
      id: this.id,
      messages: this.messages,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
    localStorage.setItem('aether_conversation', data);
  } catch(e) {
    // localStorage full — trim old messages
    if (this.messages.length > 10) {
      this.messages = this.messages.slice(-10);
      this._save();
    }
  }
};

Aether.Conversation.prototype.load = function() {
  if (this._loaded) return false;
  this._loaded = true;

  try {
    var data = localStorage.getItem('aether_conversation');
    if (!data) return false;

    var parsed = JSON.parse(data);
    if (!parsed.messages || !Array.isArray(parsed.messages)) return false;

    this.id = parsed.id || this._uuid();
    this.messages = parsed.messages;
    this.createdAt = parsed.createdAt || Date.now();
    this.updatedAt = parsed.updatedAt || Date.now();
    return true;
  } catch(e) {
    return false;
  }
};

Aether.Conversation.prototype.deleteStorage = function() {
  try {
    localStorage.removeItem('aether_conversation');
    this.clear();
  } catch(e) { /* ignore */ }
};

// ── Helpers ──────────────────────────────────────

Aether.Conversation.prototype._uuid = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

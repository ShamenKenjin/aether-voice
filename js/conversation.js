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
    // Also save to individual key for history loading
    localStorage.setItem('aether_conv_' + this.id, data);
    // Also save to history list
    Aether.Conversation.saveCurrent(this);
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

// ── Conversation History (static) ─────────────────

Aether.Conversation.listAll = function() {
  try {
    var raw = localStorage.getItem('aether_conversations');
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
};

Aether.Conversation.saveAll = function(list) {
  try {
    localStorage.setItem('aether_conversations', JSON.stringify(list));
  } catch(e) { /* quota */ }
};

Aether.Conversation.deleteConv = function(id) {
  var list = Aether.Conversation.listAll();
  list = list.filter(function(c) { return c.id !== id; });
  Aether.Conversation.saveAll(list);
  localStorage.removeItem('aether_conv_' + id);
};

Aether.Conversation.saveCurrent = function(conv) {
  var list = Aether.Conversation.listAll();
  // Upsert
  var found = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === conv.id) { list[i] = Aether.Conversation._summarize(conv); found = true; break; }
  }
  if (!found) list.unshift(Aether.Conversation._summarize(conv));
  // Keep max 50
  if (list.length > 50) list = list.slice(0, 50);
  Aether.Conversation.saveAll(list);
};

Aether.Conversation._summarize = function(conv) {
  return {
    id: conv.id,
    title: Aether.Conversation._makeTitle(conv),
    messageCount: conv.messages.length,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt
  };
};

Aether.Conversation._makeTitle = function(conv) {
  for (var i = 0; i < conv.messages.length; i++) {
    if (conv.messages[i].role === 'user' && conv.messages[i].content) {
      var text = conv.messages[i].content.replace(/\n/g, ' ').trim();
      return text.length > 40 ? text.slice(0, 40) + '...' : text;
    }
  }
  return 'New Conversation';
};


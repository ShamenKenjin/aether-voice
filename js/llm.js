// Aether — llm.js
// Multi-provider LLM client: DeepSeek (OpenAI-compatible) + Gemini (Google format)
var Aether = window.Aether || {};

Aether.LLM = function() {
  this.abortController = null;
  this.tokenUsage = { input: 0, output: 0, cost: 0 };
  this._loadUsage();
};

// ── Send Message (dispatches by provider) ─────────

Aether.LLM.prototype.send = function(messages, options) {
  options = options || {};
  var provider = Aether.SETTINGS.llmProvider || 'deepseek';

  if (provider === 'gemini') {
    return this._sendGemini(messages, options);
  } else {
    // deepseek (OpenAI-compatible)
    return this._sendOpenAI(messages, options);
  }
};

// ── OpenAI-compatible Send (DeepSeek) ─────────────

Aether.LLM.prototype._sendOpenAI = function(messages, options) {
  var p = Aether.PROVIDERS.deepseek;
  var apiKey = Aether.SETTINGS.apiKey;
  if (!apiKey) {
    if (options.onError) options.onError(Aether.t('errors.noApiKey'));
    return;
  }

  // Build messages with system prompt
  var fullMessages = [{ role: 'system', content: Aether.SETTINGS.systemPrompt }];
  fullMessages = fullMessages.concat(messages.slice(-30));

  var body = {
    model: p.model,
    messages: fullMessages,
    max_tokens: p.maxTokens,
    temperature: p.temperature,
    top_p: p.topP,
    stream: !!options.streaming
  };

  this.abortController = new AbortController();
  var self = this;

  // Track input tokens (approximate)
  var inputChars = JSON.stringify(fullMessages).length;
  this._addUsage(inputChars, 0, p.priceInput, p.priceOutput);

  if (options.streaming) {
    this._streamOpenAI(p.endpoint, apiKey, body, options);
  } else {
    this._fetchOpenAI(p.endpoint, apiKey, body, options);
  }
};

Aether.LLM.prototype._streamOpenAI = function(endpoint, apiKey, body, options) {
  var self = this;
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify(body),
    signal: this.abortController.signal
  })
  .then(function(response) {
    if (!response.ok) {
      return response.json().then(function(data) {
        throw new Error(data.error ? data.error.message : 'HTTP ' + response.status);
      });
    }
    return self._readOpenAIStream(response, options);
  })
  .catch(function(err) {
    if (err.name === 'AbortError') return;
    if (options.onError) options.onError(err.message || Aether.t('errors.apiError'));
  });
};

Aether.LLM.prototype._readOpenAIStream = function(response, options) {
  var reader = response.body.getReader();
  var decoder = new TextDecoder();
  var fullContent = '';
  var self = this;

  function pump() {
    reader.read().then(function(result) {
      if (result.done) {
        self._addUsage(0, fullContent.length, 0, 0);
        if (options.onComplete) options.onComplete(fullContent);
        return;
      }
      var chunk = decoder.decode(result.value, { stream: true });
      var lines = chunk.split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line || !line.startsWith('data: ')) continue;
        var data = line.slice(6);
        if (data === '[DONE]') {
          self._addUsage(0, fullContent.length, 0, 0);
          if (options.onComplete) options.onComplete(fullContent);
          return;
        }
        try {
          var parsed = JSON.parse(data);
          var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
          if (delta && delta.content) {
            fullContent += delta.content;
            if (options.onToken) options.onToken(delta.content, fullContent);
          }
        } catch(e) {}
      }
      pump();
    }).catch(function(err) {
      if (err.name === 'AbortError') return;
      if (options.onError) options.onError(err.message);
    });
  }
  pump();
};

Aether.LLM.prototype._fetchOpenAI = function(endpoint, apiKey, body, options) {
  var self = this;
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify(body),
    signal: this.abortController.signal
  })
  .then(function(response) {
    if (!response.ok) {
      return response.json().then(function(data) {
        throw new Error(data.error ? data.error.message : 'HTTP ' + response.status);
      });
    }
    return response.json();
  })
  .then(function(data) {
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('No response content');
    self._addUsage(0, content.length, 0, 0);
    if (options.onComplete) options.onComplete(content);
  })
  .catch(function(err) {
    if (err.name === 'AbortError') return;
    if (options.onError) options.onError(err.message || Aether.t('errors.apiError'));
  });
};

// ── Gemini Send (Google format) ───────────────────

Aether.LLM.prototype._sendGemini = function(messages, options) {
  var p = Aether.PROVIDERS.gemini;
  var apiKey = Aether.SETTINGS.geminiKey;
  if (!apiKey) {
    if (options.onError) options.onError('No Gemini API key. Add it in Settings.');
    return;
  }

  // Convert OpenAI-format messages to Gemini format
  var contents = [];
  var systemText = '';
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (m.role === 'system') {
      systemText = m.content;
      continue;
    }
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    });
  }

  var body = { contents: contents };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }
  body.generationConfig = {
    maxOutputTokens: p.maxTokens,
    temperature: p.temperature,
    topP: p.topP
  };

  var url = p.endpoint + '?key=' + apiKey;

  this.abortController = new AbortController();
  var self = this;

  // Track input tokens
  var inputChars = JSON.stringify(contents).length + systemText.length;
  this._addUsage(inputChars, 0, p.priceInput, p.priceOutput);

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: this.abortController.signal
  })
  .then(function(res) {
    if (!res.ok) {
      return res.json().then(function(err) {
        throw new Error(err.error ? err.error.message : 'HTTP ' + res.status);
      });
    }
    return res.json();
  })
  .then(function(data) {
    var text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      var parts = data.candidates[0].content.parts;
      for (var j = 0; j < parts.length; j++) {
        if (parts[j].text) text += parts[j].text;
      }
    }
    if (!text) throw new Error('No response from Gemini');
    self._addUsage(0, text.length, 0, 0);
    if (options.onComplete) options.onComplete(text);
  })
  .catch(function(err) {
    if (err.name === 'AbortError') return;
    if (options.onError) options.onError(err.message || Aether.t('errors.apiError'));
  });
};

// ── Token Usage Tracking ──────────────────────────

Aether.LLM.prototype._addUsage = function(inputChars, outputChars, priceIn, priceOut) {
  // Approximate: ~4 chars per token (English), mixed content
  var inTokens = Math.ceil(inputChars / 3.5);
  var outTokens = Math.ceil(outputChars / 3.5);

  this.tokenUsage.input += inTokens;
  this.tokenUsage.output += outTokens;
  // Cost per 1M tokens
  this.tokenUsage.cost += (inTokens / 1000000) * priceIn + (outTokens / 1000000) * priceOut;
  this._saveUsage();
};

Aether.LLM.prototype._saveUsage = function() {
  try {
    localStorage.setItem('aether_token_usage', JSON.stringify(this.tokenUsage));
  } catch(e) {}
};

Aether.LLM.prototype._loadUsage = function() {
  try {
    var raw = localStorage.getItem('aether_token_usage');
    if (raw) this.tokenUsage = JSON.parse(raw);
  } catch(e) {
    this.tokenUsage = { input: 0, output: 0, cost: 0 };
  }
};

Aether.LLM.prototype.resetUsage = function() {
  this.tokenUsage = { input: 0, output: 0, cost: 0 };
  this._saveUsage();
};

// ── Abort ────────────────────────────────────────

Aether.LLM.prototype.abort = function() {
  if (this.abortController) {
    this.abortController.abort();
    this.abortController = null;
  }
};

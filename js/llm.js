// Aether — llm.js
// DeepSeek API client: send messages, handle streaming/non-streaming responses
var Aether = window.Aether || {};

Aether.LLM = function() {
  this.abortController = null;
};

// ── Send Message ─────────────────────────────────
// options: { streaming, onToken, onComplete, onError }

Aether.LLM.prototype.send = function(messages, options) {
  options = options || {};
  var streaming = options.streaming !== undefined ? options.streaming : Aether.SETTINGS.streamingEnabled;

  if (streaming) {
    return this._sendStreaming(messages, options);
  } else {
    return this._sendNonStreaming(messages, options);
  }
};

// ── Streaming Send ───────────────────────────────

Aether.LLM.prototype._sendStreaming = function(messages, options) {
  var apiKey = Aether.SETTINGS.apiKey;
  if (!apiKey) {
    if (options.onError) options.onError(Aether.t('errors.noApiKey'));
    return;
  }

  // Build messages array with system prompt
  var fullMessages = [{ role: 'system', content: Aether.SETTINGS.systemPrompt }];
  // Include last N messages for context (limit to avoid token overflow)
  var recentMessages = messages.slice(-30);
  fullMessages = fullMessages.concat(recentMessages);

  var body = {
    model: Aether.API.model,
    messages: fullMessages,
    max_tokens: Aether.API.maxTokens,
    temperature: Aether.API.temperature,
    top_p: Aether.API.topP,
    stream: true
  };

  this.abortController = new AbortController();
  var self = this;

  fetch(Aether.API.endpoint, {
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
    return self._readStream(response, options);
  })
  .catch(function(err) {
    if (err.name === 'AbortError') return;
    if (options.onError) {
      var msg = err.message || Aether.t('errors.apiError');
      options.onError(msg);
    }
  });
};

Aether.LLM.prototype._readStream = function(response, options) {
  var reader = response.body.getReader();
  var decoder = new TextDecoder();
  var fullContent = '';
  var self = this;

  function pump() {
    reader.read().then(function(result) {
      if (result.done) {
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
        } catch(e) { /* skip malformed JSON lines */ }
      }

      pump();
    }).catch(function(err) {
      if (err.name === 'AbortError') return;
      if (options.onError) options.onError(err.message);
    });
  }

  pump();
};

// ── Non-Streaming Send ───────────────────────────

Aether.LLM.prototype._sendNonStreaming = function(messages, options) {
  var apiKey = Aether.SETTINGS.apiKey;
  if (!apiKey) {
    if (options.onError) options.onError(Aether.t('errors.noApiKey'));
    return;
  }

  var fullMessages = [{ role: 'system', content: Aether.SETTINGS.systemPrompt }];
  fullMessages = fullMessages.concat(messages.slice(-30));

  var body = {
    model: Aether.API.model,
    messages: fullMessages,
    max_tokens: Aether.API.maxTokens,
    temperature: Aether.API.temperature,
    top_p: Aether.API.topP,
    stream: false
  };

  this.abortController = new AbortController();

  fetch(Aether.API.endpoint, {
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
    if (options.onComplete) options.onComplete(content);
  })
  .catch(function(err) {
    if (err.name === 'AbortError') return;
    if (options.onError) {
      var msg = err.message || Aether.t('errors.apiError');
      options.onError(msg);
    }
  });
};

// ── Abort ────────────────────────────────────────

Aether.LLM.prototype.abort = function() {
  if (this.abortController) {
    this.abortController.abort();
    this.abortController = null;
  }
};

// Aether — vision.js
// Gemini Vision API: image analysis, PDF text extraction, rich media helpers
var Aether = window.Aether || {};

Aether.Vision = function() {
  this._loadedPdfJs = false;
  this.VISION_MODEL = 'gemini-3.1-flash';
};

// ── Image Analysis (Gemini Vision) ────────────────

Aether.Vision.prototype.analyzeImage = function(file) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // Read file as base64
    var reader = new FileReader();
    reader.onload = function(e) {
      var base64 = e.target.result.split(',')[1]; // strip data:... prefix
      var mimeType = file.type || 'image/png';
      self._callGeminiVision(base64, mimeType, resolve, reject);
    };
    reader.onerror = function() {
      reject('Cannot read image file');
    };
    reader.readAsDataURL(file);
  });
};

Aether.Vision.prototype._callGeminiVision = function(base64Data, mimeType, resolve, reject) {
  var apiKey = Aether.SETTINGS.geminiKey || '';
  if (!apiKey) { reject('No Gemini API key set. Please add your Gemini API key in Settings.'); return; }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + this.VISION_MODEL + ':generateContent?key=' + apiKey;

  var body = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: 'Describe this image in detail. What do you see? Include any text visible, objects, people, colors, and the overall scene. Respond in the same language as any text you see in the image. Be concise but thorough.'
        }
      ]
    }]
  };

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(function(res) {
    if (!res.ok) {
      return res.json().then(function(err) {
        throw new Error('Gemini Vision: HTTP ' + res.status + ' — ' + (err.error ? err.error.message : ''));
      });
    }
    return res.json();
  })
  .then(function(data) {
    var text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      var parts = data.candidates[0].content.parts;
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].text) text += parts[i].text;
      }
    }
    if (!text) { reject('No description returned from Vision API'); return; }
    resolve(text);
  })
  .catch(function(err) {
    reject(err.message || 'Vision API error');
  });
};

// ── PDF Text Extraction (pdf.js CDN) ──────────────

Aether.Vision.prototype.extractPdfText = function(file) {
  var self = this;
  return new Promise(function(resolve, reject) {
    // Load pdf.js once
    self._ensurePdfJs().then(function() {
      self._doPdfExtract(file, resolve, reject);
    }).catch(function(err) {
      reject('Failed to load PDF reader: ' + err);
    });
  });
};

Aether.Vision.prototype._ensurePdfJs = function() {
  if (this._loadedPdfJs) return Promise.resolve();
  if (this._loadingPdf) return this._loadingPdf;

  var self = this;
  this._loadingPdf = new Promise(function(resolve, reject) {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = function() {
      // Set worker
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        self._loadedPdfJs = true;
        resolve();
      } else {
        reject('pdf.js did not load');
      }
    };
    script.onerror = function() { reject('Network error loading pdf.js'); };
    document.head.appendChild(script);
  });
  return this._loadingPdf;
};

Aether.Vision.prototype._doPdfExtract = function(file, resolve, reject) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var typedArray = new Uint8Array(e.target.result);
    window.pdfjsLib.getDocument({ data: typedArray }).promise.then(function(pdf) {
      var totalPages = pdf.numPages;
      var pages = [];
      var extracted = '';

      function loadPage(pageNum) {
        pdf.getPage(pageNum).then(function(page) {
          return page.getTextContent();
        }).then(function(content) {
          var text = content.items.map(function(item) { return item.str; }).join(' ');
          extracted += '\n\n--- Page ' + pageNum + ' ---\n' + text;

          if (pageNum < totalPages) {
            loadPage(pageNum + 1);
          } else {
            // Truncate to ~12000 chars
            if (extracted.length > 12000) {
              extracted = extracted.slice(0, 12000) + '\n... (truncated, ' + totalPages + ' pages total)';
            }
            resolve(extracted);
          }
        }).catch(function(err) {
          reject('PDF page error: ' + (err.message || err));
        });
      }

      loadPage(1);
    }).catch(function(err) {
      reject('Cannot parse PDF: ' + (err.message || err));
    });
  };
  reader.onerror = function() { reject('Cannot read PDF file'); };
  reader.readAsArrayBuffer(file);
};

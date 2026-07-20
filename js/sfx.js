// Aether — sfx.js
// Sound effects via Web Audio API (no external files)
var Aether = window.Aether || {};

Aether.SFX = function() {
  this.ctx = null;
  this.enabled = true;
  this._init();
};

Aether.SFX.prototype._init = function() {
  try {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) {
    this.enabled = false;
  }
};

// Ensure context is running (browsers require user gesture)
Aether.SFX.prototype._ensure = function() {
  if (!this.ctx) return false;
  if (this.ctx.state === 'suspended') {
    this.ctx.resume();
  }
  return true;
};

// ── Send whoosh (short sweep up) ────────────────

Aether.SFX.prototype.sendWhoosh = function() {
  if (!this.enabled || !this._ensure()) return;

  var ctx = this.ctx;
  var now = ctx.currentTime;

  // Noise burst → bandpass filter sweep
  var bufferSize = ctx.sampleRate * 0.12;
  var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  var data = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }

  var noise = ctx.createBufferSource();
  noise.buffer = buffer;

  var filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
  filter.Q.value = 2;

  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + 0.12);
};

// ── Receive chime (two-note ding) ───────────────

Aether.SFX.prototype.receiveChime = function() {
  if (!this.enabled || !this._ensure()) return;

  var ctx = this.ctx;
  var now = ctx.currentTime;

  // Two-note chime: C5 → E5
  var notes = [
    { freq: 523.25, time: 0, dur: 0.12, vol: 0.1 },
    { freq: 659.25, time: 0.08, dur: 0.18, vol: 0.08 }
  ];

  for (var i = 0; i < notes.length; i++) {
    var n = notes[i];
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = n.freq;

    gain.gain.setValueAtTime(0, now + n.time);
    gain.gain.linearRampToValueAtTime(n.vol, now + n.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + n.time);
    osc.stop(now + n.time + n.dur);
  }
};

// ── Mic click (short tick) ──────────────────────

Aether.SFX.prototype.micClick = function() {
  if (!this.enabled || !this._ensure()) return;

  var ctx = this.ctx;
  var now = ctx.currentTime;

  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 800;

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
};

// ── Error buzz (low rumble) ─────────────────────

Aether.SFX.prototype.errorBuzz = function() {
  if (!this.enabled || !this._ensure()) return;

  var ctx = this.ctx;
  var now = ctx.currentTime;

  var osc = ctx.createOscillator();
  var gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.linearRampToValueAtTime(80, now + 0.25);

  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
};

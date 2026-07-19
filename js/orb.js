// Aether — orb.js
// Canvas-based animated AI orb with 5 states
var Aether = window.Aether || {};

Aether.Orb = function(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.state = 'idle'; // idle | listening | thinking | speaking | error
  this.frame = 0;
  this.animId = null;

  // Configuration
  this.particles = [];
  this.particleCount = 18;
  this.rings = [];
  this.waves = [];

  // Reactivity (fake audio levels for listening state)
  this.reactivity = 0;
  this.targetReactivity = 0;

  this._resize();
  this._initParticles();
  this._startLoop();

  // Resize observer (canvas auto-sizing)
  var self = this;
  window.addEventListener('resize', function() { self._resize(); });
};

// ── Canvas Sizing ────────────────────────────────

Aether.Orb.prototype._resize = function() {
  var parent = this.canvas.parentElement;
  var size = Math.min(parent.clientWidth, parent.clientHeight);
  var dpr = window.devicePixelRatio || 1;
  this.canvas.width = size * dpr;
  this.canvas.height = size * dpr;
  this.canvas.style.width = size + 'px';
  this.canvas.style.height = size + 'px';
  this.size = size;
  this.cx = size / 2;
  this.cy = size / 2;
  this.radius = size * 0.18;
};

// ── Particles ────────────────────────────────────

Aether.Orb.prototype._initParticles = function() {
  this.particles = [];
  for (var i = 0; i < this.particleCount; i++) {
    this.particles.push({
      angle: (Math.PI * 2 * i) / this.particleCount + Math.random() * 0.5,
      orbit: this.radius * (1.6 + Math.random() * 1.2),
      speed: 0.003 + Math.random() * 0.006,
      size: 1 + Math.random() * 2,
      alpha: 0.3 + Math.random() * 0.5,
      offset: Math.random() * Math.PI * 2
    });
  }
};

// ── Animation Loop ───────────────────────────────

Aether.Orb.prototype._startLoop = function() {
  var self = this;
  var animate = function() {
    self.frame++;
    self._update();
    self._draw();
    self.animId = requestAnimationFrame(animate);
  };
  animate();
};

Aether.Orb.prototype._update = function() {
  // Smooth reactivity
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.15;

  // Update rings (speaking state)
  for (var i = this.rings.length - 1; i >= 0; i--) {
    this.rings[i].radius += this.rings[i].speed;
    this.rings[i].alpha -= 0.012;
    if (this.rings[i].alpha <= 0) this.rings.splice(i, 1);
  }

  // Spawn rings in speaking state
  if (this.state === 'speaking' && this.frame % 25 === 0) {
    this.rings.push({
      radius: this.radius * 1.1,
      speed: 1.2 + Math.random() * 1.5,
      alpha: 0.5,
      maxR: this.size * 0.45
    });
  }
};

// ── State Public API ─────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;

  switch (state) {
    case 'idle':
      this.targetReactivity = 0;
      break;
    case 'listening':
      this.targetReactivity = 0.6 + Math.random() * 0.4;
      break;
    case 'thinking':
      this.targetReactivity = 0;
      break;
    case 'speaking':
      this.targetReactivity = 0.3;
      break;
    case 'error':
      this.targetReactivity = 0;
      break;
  }
};

// Spice up listening state with fake reactivity
Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') {
    this.targetReactivity = Math.min(1, 0.3 + intensity * 0.7);
  }
};

// ── Draw ─────────────────────────────────────────

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx;
  var dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);

  // Clear
  ctx.clearRect(0, 0, this.size, this.size);

  // State-specific drawing
  switch (this.state) {
    case 'idle':       this._drawIdle(ctx); break;
    case 'listening':  this._drawListening(ctx); break;
    case 'thinking':   this._drawThinking(ctx); break;
    case 'speaking':   this._drawSpeaking(ctx); break;
    case 'error':      this._drawError(ctx); break;
  }

  ctx.restore();
};

// ── Idle State ───────────────────────────────────

Aether.Orb.prototype._drawIdle = function(ctx) {
  var pulse = 1 + Math.sin(this.frame * 0.03) * 0.06;

  // Outer glow
  this._drawGlow(ctx, this.cx, this.cy, this.radius * 2.2 * pulse, 'rgba(0,240,255,0.08)');
  this._drawGlow(ctx, this.cx, this.cy, this.radius * 1.5, 'rgba(0,240,255,0.15)');

  // Core orb
  this._drawOrbCore(ctx, 'rgba(0,240,255,0.25)', 'rgba(0,240,255,0.12)', pulse);

  // Orbiting particles
  this._drawParticles(ctx, 'rgba(0,240,255,0.7)', false);
};

// ── Listening State ──────────────────────────────

Aether.Orb.prototype._drawListening = function(ctx) {
  var r = this.reactivity;
  var pulse = 1 + r * 0.25 + Math.sin(this.frame * 0.05) * 0.05;

  // Pulsing glow
  var glowAlpha = 0.1 + r * 0.15;
  this._drawGlow(ctx, this.cx, this.cy, this.radius * (2.5 + r * 1.5) * pulse, 'rgba(255,255,255,' + glowAlpha + ')');
  this._drawGlow(ctx, this.cx, this.cy, this.radius * (1.6 + r * 0.8) * pulse, 'rgba(0,240,255,' + (0.15 + r * 0.2) + ')');

  // Core orb (larger during listening)
  this._drawOrbCore(ctx, 'rgba(255,255,255,' + (0.2 + r * 0.3) + ')', 'rgba(0,240,255,' + (0.1 + r * 0.15) + ')', pulse);

  // Audio-reactive particles (wider orbit, faster)
  this._drawParticles(ctx, 'rgba(255,255,255,0.8)', true, r);
};

// ── Thinking State ───────────────────────────────

Aether.Orb.prototype._drawThinking = function(ctx) {
  var spin = this.frame * 0.06;
  var pulse = 1 + Math.sin(this.frame * 0.08) * 0.1;

  // Magenta glow
  this._drawGlow(ctx, this.cx, this.cy, this.radius * 2.4 * pulse, 'rgba(255,0,255,0.1)');
  this._drawGlow(ctx, this.cx, this.cy, this.radius * 1.6 * pulse, 'rgba(255,0,255,0.18)');

  // Core orb
  this._drawOrbCore(ctx, 'rgba(255,0,255,0.3)', 'rgba(255,0,255,0.15)', pulse);

  // Fast orbiting particles
  this._drawParticles(ctx, 'rgba(255,0,255,0.8)', true, 0, 2.5);
};

// ── Speaking State ───────────────────────────────

Aether.Orb.prototype._drawSpeaking = function(ctx) {
  var pulse = 1 + Math.sin(this.frame * 0.04) * 0.08;

  // Glow
  this._drawGlow(ctx, this.cx, this.cy, this.radius * 2 * pulse, 'rgba(0,240,255,0.08)');
  this._drawGlow(ctx, this.cx, this.cy, this.radius * 1.4 * pulse, 'rgba(0,240,255,0.15)');

  // Core
  this._drawOrbCore(ctx, 'rgba(0,240,255,0.25)', 'rgba(0,240,255,0.1)', pulse);

  // Expanding rings
  for (var i = 0; i < this.rings.length; i++) {
    var ring = this.rings[i];
    if (ring.radius < ring.maxR) {
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, ring.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,240,255,' + ring.alpha + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Particles
  this._drawParticles(ctx, 'rgba(0,240,255,0.6)', false);
};

// ── Error State ──────────────────────────────────

Aether.Orb.prototype._drawError = function(ctx) {
  var flicker = Math.sin(this.frame * 0.15) > 0 ? 1 : 0.4;

  this._drawGlow(ctx, this.cx, this.cy, this.radius * 1.8, 'rgba(255,68,102,' + (0.1 * flicker) + ')');
  this._drawGlow(ctx, this.cx, this.cy, this.radius * 1.3, 'rgba(255,68,102,' + (0.15 * flicker) + ')');

  this._drawOrbCore(ctx, 'rgba(255,68,102,' + (0.3 * flicker) + ')', 'rgba(255,68,102,' + (0.1 * flicker) + ')', 1);

  this._drawParticles(ctx, 'rgba(255,68,102,' + (0.7 * flicker) + ')', false);
};

// ── Drawing Primitives ───────────────────────────

Aether.Orb.prototype._drawGlow = function(ctx, x, y, r, color) {
  var grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};

Aether.Orb.prototype._drawOrbCore = function(ctx, innerColor, outerColor, pulse) {
  var r = this.radius * pulse;

  // Outer sphere
  var grad = ctx.createRadialGradient(this.cx - r * 0.15, this.cy - r * 0.15, r * 0.1, this.cx, this.cy, r);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Specular highlight
  var hlGrad = ctx.createRadialGradient(this.cx - r * 0.25, this.cy - r * 0.3, 0, this.cx - r * 0.2, this.cy - r * 0.2, r * 0.5);
  hlGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
  hlGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
  ctx.fill();
};

Aether.Orb.prototype._drawParticles = function(ctx, color, reactive, intensity, speedMul) {
  intensity = intensity || 0;
  speedMul = speedMul || 1;

  for (var i = 0; i < this.particles.length; i++) {
    var p = this.particles[i];
    p.angle += p.speed * speedMul;

    var orbitR = p.orbit + (reactive ? intensity * 25 * Math.sin(this.frame * 0.1 + p.offset) : 0);
    var x = this.cx + Math.cos(p.angle) * orbitR;
    var y = this.cy + Math.sin(p.angle) * orbitR;

    ctx.beginPath();
    ctx.arc(x, y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = color.replace('0.8', String(p.alpha)).replace('0.7', String(p.alpha)).replace('0.6', String(p.alpha));
    ctx.fill();

    // Particle trail/glow
    ctx.beginPath();
    ctx.arc(x, y, p.size * 3, 0, Math.PI * 2);
    var trailAlpha = '0.1';
    ctx.fillStyle = color.replace(/[\d.]+(?=\))/, trailAlpha);
    ctx.fill();
  }
};

// Aether — orb.js → Gyroscopic Hologram Sphere
// Multi-axis spinning rings, glowing core, orbiting particles, state-driven colors
// API unchanged: Aether.Orb(canvasId), setState, pulse
var Aether = window.Aether || {};

Aether.Orb = function(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.state = 'idle';
  this.frame = 0; this.animId = null;
  this.reactivity = 0; this.targetReactivity = 0;

  // Rings: {angleX, angleY, angleZ, speed, radius, width, alpha, rotationSpeed}
  this.rings = [];
  this._initRings();

  // Orbiting particles
  this.particles = [];
  this._initParticles(30);

  // Core pulse
  this.corePulse = 1;

  this._resize();
  this._startLoop();
  var self = this;
  window.addEventListener('resize', function(){self._resize();});
};

// ── Init rings (gyroscope layers) ────────────────

Aether.Orb.prototype._initRings = function() {
  this.rings = [
    { rx: 0.8, ry: 0.15, rz: 0,   speed: 0.008, r: 0.72, w: 1.5, a: 0.6 },   // horizontal main
    { rx: 0.15, ry: 0.8, rz: 0,   speed: 0.012, r: 0.68, w: 1.2, a: 0.4 },   // vertical
    { rx: 0.5,  ry: 0.5, rz: 0.3, speed: 0.01,  r: 0.75, w: 1.0, a: 0.35 },  // diagonal
    { rx: 0.3,  ry: 0.4, rz: 0.7, speed: 0.014, r: 0.65, w: 0.8, a: 0.3 },   // tilted 1
    { rx: 0.6,  ry: 0.2, rz: 0.5, speed: 0.009, r: 0.70, w: 0.7, a: 0.25 },  // tilted 2
  ];
};

Aether.Orb.prototype._initParticles = function(count) {
  this.particles = [];
  for (var i = 0; i < count; i++) {
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.random() * Math.PI * 2;
    var orbitR = 0.55 + Math.random() * 0.35;
    this.particles.push({
      theta: theta, phi: phi,
      orbitR: orbitR,
      speed: 0.005 + Math.random() * 0.015,
      size: 0.6 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.5
    });
  }
};

// ── Sizing ────────────────────────────────────────

Aether.Orb.prototype._resize = function() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var size = this.canvas.parentElement.clientHeight || 220;
  this.canvas.width = size * dpr;
  this.canvas.height = size * dpr;
  this.canvas.style.width = size + 'px';
  this.canvas.style.height = size + 'px';
  this.size = size; this.R = size / 2 * 0.62;
  this.cx = size / 2; this.cy = size / 2;
};

// ── Animation ────────────────────────────────────

Aether.Orb.prototype._startLoop = function() {
  var self = this;
  (function a(){self.frame++; self._update(); self._draw(); self.animId=requestAnimationFrame(a);})();
};

Aether.Orb.prototype._update = function() {
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.1;
  this.corePulse = 1 + Math.sin(this.frame * 0.03) * 0.08 + this.reactivity * 0.15;

  // Rotate rings
  for (var i = 0; i < this.rings.length; i++) {
    this.rings[i].rz += this.rings[i].speed;
    this.rings[i].rx += this.rings[i].speed * 0.4;
  }

  // Orbit particles
  for (var j = 0; j < this.particles.length; j++) {
    var p = this.particles[j];
    p.theta += p.speed;
    p.phi += p.speed * 0.7;
  }
};

// ── Public API ───────────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;
  switch (state) {
    case 'idle': this.targetReactivity = 0; break;
    case 'listening': this.targetReactivity = 0.7; break;
    case 'thinking': this.targetReactivity = 0.3; break;
    case 'speaking': this.targetReactivity = 0.5; break;
    case 'error': this.targetReactivity = 0; break;
  }
};

Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') this.targetReactivity = Math.min(1, 0.3 + intensity * 0.7);
  if (this.state === 'thinking') this.targetReactivity = Math.min(1, intensity * 0.6);
};

// ── Colors ───────────────────────────────────────

Aether.Orb.prototype._c = function() {
  var r = this.reactivity;
  switch (this.state) {
    case 'idle':      return {p:'0,240,255', g:'0,240,255', ga:0.08, inner:'0,240,255', ia:0.25};
    case 'listening': return {p:'180,255,255', g:'150,240,255', ga:0.15+r*0.1, inner:'255,255,255', ia:0.4+r*0.3};
    case 'thinking':  return {p:'255,80,255', g:'255,80,255', ga:0.12, inner:'255,120,255', ia:0.3};
    case 'speaking':  return {p:'0,240,255', g:'0,240,255', ga:0.1, inner:'100,255,255', ia:0.3};
    case 'error':     return {p:'255,68,102', g:'255,68,102', ga:0.06, inner:'255,80,100', ia:0.2};
    default:          return {p:'0,240,255', g:'0,240,255', ga:0.08, inner:'0,240,255', ia:0.25};
  }
};

// ═══════════════════════════════════════════════════
//  MAIN DRAW
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx, dpr = Math.min(window.devicePixelRatio||1,2);
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, this.size, this.size);

  var c = this._c();

  // Background glow
  var glow = ctx.createRadialGradient(this.cx, this.cy, this.R * 0.2, this.cx, this.cy, this.R * 1.5);
  glow.addColorStop(0, 'rgba(' + c.g + ',' + c.ga + ')');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, this.R * 1.5, 0, Math.PI * 2); ctx.fill();

  // Inner core
  this._drawCore(ctx, c);

  // Rings (back half — lower z)
  this._drawRings(ctx, c, -1);

  // Orbiting particles
  this._drawParticles(ctx, c);

  // Rings (front half — upper z)
  this._drawRings(ctx, c, 1);

  // Outer glow ring
  var ringAlpha = 0.04 + Math.sin(this.frame * 0.025) * 0.02 + this.reactivity * 0.05;
  ctx.strokeStyle = 'rgba(' + c.p + ',' + ringAlpha + ')';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, this.R * 1.08, 0, Math.PI * 2); ctx.stroke();

  ctx.restore();
};

// ── Inner glowing core ───────────────────────────

Aether.Orb.prototype._drawCore = function(ctx, c) {
  var r = this.R * 0.18 * this.corePulse;

  // Outer core glow
  var outer = ctx.createRadialGradient(this.cx, this.cy, r * 0.4, this.cx, this.cy, r * 2.5);
  outer.addColorStop(0, 'rgba(' + c.inner + ',' + c.ia + ')');
  outer.addColorStop(0.5, 'rgba(' + c.p + ',0.1)');
  outer.addColorStop(1, 'transparent');
  ctx.fillStyle = outer;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, r * 2.5, 0, Math.PI * 2); ctx.fill();

  // Bright center
  var core = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, r);
  core.addColorStop(0, 'rgba(255,255,255,0.9)');
  core.addColorStop(0.3, 'rgba(' + c.inner + ',0.6)');
  core.addColorStop(1, 'rgba(' + c.inner + ',0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2); ctx.fill();
};

// ── Gyroscopic rings (3D projected ellipses) ─────

Aether.Orb.prototype._drawRings = function(ctx, c, side) {
  for (var i = 0; i < this.rings.length; i++) {
    var ring = this.rings[i];

    // 3D rotation → project to 2D ellipse
    // Simplified: use sine of rotation to determine tilt
    var rx = this.R * ring.r;
    var ry = this.R * ring.r * Math.abs(Math.cos(ring.rz)) * 0.35 + this.R * ring.r * 0.15;
    var rotation = ring.rz * 2;
    var tilt = ring.rx * 0.3;

    // Only draw based on z-order (which "side" of sphere the ring is on)
    var zOrder = Math.sin(ring.rz);
    if ((side > 0 && zOrder >= -0.1) || (side < 0 && zOrder < -0.1)) {
      var alpha = ring.a + this.reactivity * 0.15;
      if (this.state === 'listening') alpha += 0.1;

      ctx.save();
      ctx.translate(this.cx, this.cy);
      ctx.rotate(rotation);

      ctx.strokeStyle = 'rgba(' + c.p + ',' + alpha + ')';
      ctx.lineWidth = ring.w;
      ctx.shadowColor = 'rgba(' + c.p + ',' + (alpha * 0.5) + ')';
      ctx.shadowBlur = 3;

      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
};

// ── Orbiting particles (3D sphere surface) ───────

Aether.Orb.prototype._drawParticles = function(ctx, c) {
  for (var i = 0; i < this.particles.length; i++) {
    var p = this.particles[i];

    // Spherical to Cartesian (simplified projection)
    var x3 = Math.sin(p.phi) * Math.cos(p.theta);
    var y3 = Math.sin(p.phi) * Math.sin(p.theta);
    var z3 = Math.cos(p.phi);

    // Perspective projection: z affects scale and alpha
    var scale = (z3 + 1.5) / 2.5; // 0.6 to 1.0
    var alpha = p.alpha * scale * (0.6 + this.reactivity * 0.4);
    var r = this.R * p.orbitR;

    var px = this.cx + x3 * r;
    var py = this.cy + y3 * r;

    ctx.fillStyle = 'rgba(' + c.p + ',' + alpha + ')';
    ctx.shadowColor = 'rgba(' + c.p + ',' + (alpha * 0.5) + ')';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.arc(px, py, p.size * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
};

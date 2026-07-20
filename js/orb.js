// Aether — orb.js → JARVIS HUD Orb (matching reference exactly)
// Outer ring system, thick segmented arcs, ticked rings, 3D particle core, orbital ellipses
// API unchanged: Aether.Orb(canvasId), setState, pulse
var Aether = window.Aether || {};

Aether.Orb = function(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.state = 'idle';
  this.frame = 0; this.animId = null;
  this.reactivity = 0; this.targetReactivity = 0;

  // 3D particle cloud
  this.coreParticles = [];
  for (var i = 0; i < 200; i++) this.coreParticles.push(this._newCoreParticle());

  // Orbital nodes on ellipses
  this.orbitNodes = [];
  for (var j = 0; j < 24; j++) {
    this.orbitNodes.push({ angle: Math.random() * Math.PI * 2, orbitIdx: Math.floor(Math.random() * 4), speed: 0.008 + Math.random() * 0.02, size: 1 + Math.random() * 1.5 });
  }

  // Rotation angles
  this.arcAngle = 0;
  this.innerAngle = 0;
  this.yRot = 0;

  this._resize();
  this._startLoop();
  var self = this;
  window.addEventListener('resize', function(){self._resize();});
};

Aether.Orb.prototype._newCoreParticle = function() {
  return {
    x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: (Math.random() - 0.5) * 2,
    size: 0.5 + Math.random() * 2.5
  };
};

// ── Sizing ────────────────────────────────────────

Aether.Orb.prototype._resize = function() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var size = this.canvas.parentElement.clientHeight || 220;
  this.canvas.width = size * dpr;
  this.canvas.height = size * dpr;
  this.canvas.style.width = size + 'px';
  this.canvas.style.height = size + 'px';
  this.size = size;
  this.R = size / 2 * 0.58; // base ring radius
  this.cx = size / 2; this.cy = size / 2;
};

// ── Animation ────────────────────────────────────

Aether.Orb.prototype._startLoop = function() {
  var self = this;
  (function a(){self.frame++; self._update(); self._draw(); self.animId=requestAnimationFrame(a);})();
};

Aether.Orb.prototype._update = function() {
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.1;
  // Arc shield rotates slowly clockwise
  this.arcAngle += 0.004;
  // Inner dashed ring rotates counter-clockwise
  this.innerAngle -= 0.006;
  // 3D Y-axis rotation for core
  this.yRot += 0.01;

  // Orbit nodes advance
  for (var i = 0; i < this.orbitNodes.length; i++) {
    this.orbitNodes[i].angle += this.orbitNodes[i].speed;
  }

  // Regenerate core particles that drift too far
  for (var j = 0; j < this.coreParticles.length; j++) {
    var p = this.coreParticles[j];
    var dist = Math.sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
    if (dist > 1.05) {
      var np = this._newCoreParticle();
      p.x = np.x; p.y = np.y; p.z = np.z; p.size = np.size;
    }
    // Slight drift
    p.x += (Math.random() - 0.5) * 0.004;
    p.y += (Math.random() - 0.5) * 0.004;
    p.z += (Math.random() - 0.5) * 0.004;
  }
};

// ── Public API ───────────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;
  switch (state) {
    case 'idle': this.targetReactivity = 0; break;
    case 'listening': this.targetReactivity = 0.6; break;
    case 'thinking': this.targetReactivity = 0.3; break;
    case 'speaking': this.targetReactivity = 0.4; break;
    case 'error': this.targetReactivity = 0; break;
  }
};

Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') this.targetReactivity = Math.min(1, 0.3 + intensity * 0.7);
  if (this.state === 'thinking') this.targetReactivity = Math.min(1, intensity * 0.6);
};

// ── Colors ───────────────────────────────────────

Aether.Orb.prototype._cyan = function(a) { return 'rgba(0,210,255,' + a + ')'; };
Aether.Orb.prototype._gold = function(a) { return 'rgba(241,196,15,' + a + ')'; };
Aether.Orb.prototype._white = function(a) { return 'rgba(255,255,255,' + a + ')'; };
Aether.Orb.prototype._glow = function(ctx, color, blur) {
  ctx.shadowColor = color; ctx.shadowBlur = blur || 12;
};

// ═══════════════════════════════════════════════════
//  MAIN DRAW
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx, dpr = Math.min(window.devicePixelRatio||1,2);
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, this.size, this.size);

  var R = this.R;
  var reaction = this.reactivity * 0.15;

  // ── Background radial glow ─────────────────────
  var bgGlow = ctx.createRadialGradient(this.cx, this.cy, R * 0.3, this.cx, this.cy, R * 1.8);
  bgGlow.addColorStop(0, 'rgba(0,40,80,0.2)');
  bgGlow.addColorStop(0.5, 'rgba(0,20,50,0.08)');
  bgGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = bgGlow;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 1.8, 0, Math.PI * 2); ctx.fill();

  // ── Layer 1: Outer dot ring ────────────────────
  ctx.strokeStyle = this._cyan(0.15 + reaction);
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 1.07, 0, Math.PI * 2); ctx.stroke();

  // Dots outside ring
  for (var d = 0; d < 360; d += 24) {
    var rad = d * Math.PI / 180;
    var dx = this.cx + Math.cos(rad) * (R * 1.07 + 4);
    var dy = this.cy + Math.sin(rad) * (R * 1.07 + 4);
    ctx.fillStyle = this._cyan(0.25 + reaction);
    ctx.beginPath(); ctx.arc(dx, dy, 1.2, 0, Math.PI * 2); ctx.fill();
  }

  // ── Layer 2: Thick segmented arcs ──────────────
  var arcs = [
    { start: -1.2, end: 0.7 },   // top-right
    { start: 1.0, end: 3.1 },    // bottom
    { start: 3.5, end: 4.7 }     // left
  ];
  for (var a = 0; a < arcs.length; a++) {
    var arc = arcs[a];
    var s = arc.start + this.arcAngle;
    var e = arc.end + this.arcAngle;

    ctx.save();
    // Dark fill with bright midline stroke
    ctx.strokeStyle = this._cyan(0.45 + reaction);
    ctx.lineWidth = 4;
    this._glow(ctx, 'rgba(0,210,255,0.5)', 6);
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.98, s, e); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Gold accent arc on bottom-left
  ctx.save();
  ctx.strokeStyle = this._gold(0.7);
  ctx.lineWidth = 1.5;
  this._glow(ctx, 'rgba(241,196,15,0.4)', 4);
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, R * 0.88, 2.2 + this.arcAngle, 2.9 + this.arcAngle);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // ── Layer 3: Fine concentric rings ─────────────
  // Thin continuous
  ctx.strokeStyle = this._cyan(0.3);
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.85, 0, Math.PI * 2); ctx.stroke();

  // Dashed ring (counter-rotating)
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -this.innerAngle * R; // creates rotation effect
  ctx.strokeStyle = this._cyan(0.25);
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.80, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Ticked ring
  ctx.strokeStyle = this._cyan(0.2);
  ctx.lineWidth = 0.5;
  for (var t = 0; t < 360; t += 5) {
    var trad = (t + this.innerAngle * 30) * Math.PI / 180;
    var tOuter = R * 0.765;
    var tInner = R * 0.745;
    ctx.beginPath();
    ctx.moveTo(this.cx + Math.cos(trad) * tOuter, this.cy + Math.sin(trad) * tOuter);
    ctx.lineTo(this.cx + Math.cos(trad) * tInner, this.cy + Math.sin(trad) * tInner);
    ctx.stroke();
  }

  // ── Layer 4: Inner core border ─────────────────
  var coreR = R * 0.5;
  ctx.strokeStyle = this._cyan(0.35);
  ctx.lineWidth = 1.2;
  this._glow(ctx, 'rgba(0,210,255,0.3)', 8);
  ctx.beginPath(); ctx.arc(this.cx, this.cy, coreR, 0, Math.PI * 2); ctx.stroke();
  ctx.shadowBlur = 0;

  // Screw nodes on border
  var screwPositions = [-0.3, 2.0, 3.8, 4.7, 5.2];
  for (var sn = 0; sn < screwPositions.length; sn++) {
    var sx = this.cx + Math.cos(screwPositions[sn]) * coreR;
    var sy = this.cy + Math.sin(screwPositions[sn]) * coreR;
    ctx.fillStyle = 'rgba(0,20,40,0.8)';
    ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this._cyan(0.4);
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.stroke();
  }

  // ── 3D Particle Core ───────────────────────────
  var cosY = Math.cos(this.yRot), sinY = Math.sin(this.yRot);
  for (var pi = 0; pi < this.coreParticles.length; pi++) {
    var p = this.coreParticles[pi];

    // Y-rotation
    var rx = p.x * cosY - p.z * sinY;
    var rz = p.x * sinY + p.z * cosY;
    var ry = p.y;

    // Project: z-depth affects alpha and scale
    var depth = (rz + 1) / 2; // 0 (back) to 1 (front)
    var px = this.cx + rx * coreR * 0.9;
    var py = this.cy + ry * coreR * 0.9;
    var alpha = depth * (0.3 + this.reactivity * 0.4);
    var sz = p.size * (0.5 + depth * 0.5);

    ctx.fillStyle = 'rgba(160,240,255,' + alpha + ')';
    ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2); ctx.fill();
  }

  // ── Orbital Ellipses ───────────────────────────
  var orbits = [
    { tilt: 0.6, rx: coreR*0.85, ry: coreR*0.2 },  // ~35 deg
    { tilt: -0.6, rx: coreR*0.85, ry: coreR*0.2 }, // ~-35 deg
    { tilt: 1.4, rx: coreR*0.85, ry: coreR*0.15 }, // ~80 deg (near-vertical)
    { tilt: 0.17, rx: coreR*0.88, ry: coreR*0.35 }  // ~10 deg (near-horizontal)
  ];

  for (var oi = 0; oi < orbits.length; oi++) {
    var orb = orbits[oi];
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(orb.tilt + this.yRot * 0.5); // subtle wobble

    var alpha = 0.15 + reaction;
    ctx.strokeStyle = 'rgba(160,240,255,' + alpha + ')';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.ellipse(0, 0, orb.rx, orb.ry, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // ── Orbital Nodes (bright dots on ellipses) ────
  for (var oni = 0; oni < this.orbitNodes.length; oni++) {
    var node = this.orbitNodes[oni];
    var ob = orbits[node.orbitIdx];
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(ob.tilt + this.yRot * 0.5);
    var nx = Math.cos(node.angle) * ob.rx;
    var ny = Math.sin(node.angle) * ob.ry;
    ctx.fillStyle = this._white(0.6 + reaction * 0.3);
    this._glow(ctx, 'rgba(160,240,255,0.6)', 3);
    ctx.beginPath(); ctx.arc(nx, ny, node.size, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Central Fusion Glow ─────────────────────────
  var pulse = 1 + Math.sin(this.frame * 0.03) * 0.05 + this.reactivity * 0.1;
  var cg = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, coreR * 0.7 * pulse);
  cg.addColorStop(0, 'rgba(255,255,255,1)');
  cg.addColorStop(0.15, 'rgba(0,210,255,0.8)');
  cg.addColorStop(0.4, 'rgba(0,100,150,0.25)');
  cg.addColorStop(0.8, 'rgba(0,40,80,0.05)');
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, coreR * 0.7 * pulse, 0, Math.PI * 2); ctx.fill();

  // ── State accent (speaking/listening) ───────────
  if (this.state === 'listening' || this.state === 'speaking') {
    var accAlpha = 0.12 + this.reactivity * 0.15;
    ctx.strokeStyle = this._white(accAlpha);
    ctx.lineWidth = 2;
    this._glow(ctx, 'rgba(255,255,255,0.4)', 15);
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 1.05, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
};

// Aether — orb.js → Sci-fi AI Face
// Canvas-based holographic humanoid face with 5 expression states
// Reuses same API as old orb: setState, pulse — zero changes needed in app.js/ui.js
var Aether = window.Aether || {};

Aether.Orb = function(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.state = 'idle';
  this.frame = 0;
  this.animId = null;

  // Reactivity / mouth-open target
  this.reactivity = 0;
  this.targetReactivity = 0;
  this.mouthOpen = 0;
  this.mouthTarget = 0;

  // Eye tracking
  this.eyeLookX = 0;
  this.eyeLookY = 0;
  this.eyeLookTargetX = 0;
  this.eyeLookTargetY = 0;

  // Blink
  this.blinkTimer = 80 + Math.random() * 120;
  this.blinking = 0;

  this._resize();
  this._startLoop();

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
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.12;

  // Mouth animation (during speaking)
  if (this.state === 'speaking') {
    this.mouthTarget = 0.3 + Math.sin(this.frame * 0.25) * 0.2 + Math.abs(Math.sin(this.frame * 0.15)) * 0.5;
  } else {
    this.mouthTarget = 0;
  }
  this.mouthOpen += (this.mouthTarget - this.mouthOpen) * 0.3;

  // Eye tracking — random micro-movements
  if (this.frame % 40 === 0) {
    this.eyeLookTargetX = (Math.random() - 0.5) * 0.12;
    this.eyeLookTargetY = (Math.random() - 0.5) * 0.08;
  }
  this.eyeLookX += (this.eyeLookTargetX - this.eyeLookX) * 0.1;
  this.eyeLookY += (this.eyeLookTargetY - this.eyeLookY) * 0.1;

  // Blink
  this.blinkTimer--;
  if (this.blinkTimer <= 0) {
    this.blinking = 1;
    this.blinkTimer = 120 + Math.random() * 200;
  }
  if (this.blinking > 0) this.blinking -= 0.15;
};

// ── State Public API ─────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;
  switch (state) {
    case 'idle':      this.targetReactivity = 0; break;
    case 'listening': this.targetReactivity = 0.7; break;
    case 'thinking':  this.targetReactivity = 0; break;
    case 'speaking':  this.targetReactivity = 0.4; break;
    case 'error':     this.targetReactivity = 0; break;
  }
};

Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') {
    this.targetReactivity = Math.min(1, 0.4 + intensity * 0.6);
  }
  if (this.state === 'thinking') {
    this.targetReactivity = Math.min(1, intensity * 0.5);
  }
};

// ── Draw ─────────────────────────────────────────

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx;
  var dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, this.size, this.size);

  var scale = this.size / 220; // base design at 220px

  // Get colors based on state
  var colors = this._colors();

  ctx.save();
  ctx.translate(this.cx, this.cy);
  ctx.scale(scale, scale);

  // Glow aura
  this._drawAura(ctx, colors);

  // Neck/shoulders
  this._drawNeck(ctx, colors);

  // Head outline
  this._drawHead(ctx, colors);

  // Eyes
  this._drawEyes(ctx, colors);

  // Nose hint
  this._drawNose(ctx, colors);

  // Mouth
  this._drawMouth(ctx, colors);

  // Scan lines / hologram effect
  this._drawScanLines(ctx, colors);

  ctx.restore();
  ctx.restore();
};

// ── Color palette per state ──────────────────────

Aether.Orb.prototype._colors = function() {
  var r = this.reactivity;
  switch (this.state) {
    case 'idle':
      return { primary: 'rgba(0,240,255,0.9)', secondary: 'rgba(0,180,220,0.5)', glow: 'rgba(0,240,255,0.15)', accent: 'rgba(0,240,255,0.3)' };
    case 'listening':
      return { primary: 'rgba(255,255,255,0.95)', secondary: 'rgba(200,240,255,0.7)', glow: 'rgba(0,240,255,' + (0.15 + r * 0.2) + ')', accent: 'rgba(255,255,255,0.4)' };
    case 'thinking':
      return { primary: 'rgba(255,0,255,0.9)', secondary: 'rgba(200,50,220,0.6)', glow: 'rgba(255,0,255,0.12)', accent: 'rgba(255,0,255,0.3)' };
    case 'speaking':
      return { primary: 'rgba(0,240,255,0.9)', secondary: 'rgba(0,200,230,0.5)', glow: 'rgba(0,240,255,0.15)', accent: 'rgba(0,240,255,0.35)' };
    case 'error':
      return { primary: 'rgba(255,68,102,0.9)', secondary: 'rgba(200,50,70,0.5)', glow: 'rgba(255,68,102,0.1)', accent: 'rgba(255,68,102,0.25)' };
    default:
      return { primary: 'rgba(0,240,255,0.9)', secondary: 'rgba(0,180,220,0.5)', glow: 'rgba(0,240,255,0.15)', accent: 'rgba(0,240,255,0.3)' };
  }
};

// ── Aura / background glow ───────────────────────

Aether.Orb.prototype._drawAura = function(ctx, c) {
  var pulse = 1 + Math.sin(this.frame * 0.02) * 0.08;
  var r = 95 * pulse;
  var grad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
  grad.addColorStop(0, c.glow);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
};

// ── Neck ─────────────────────────────────────────

Aether.Orb.prototype._drawNeck = function(ctx, c) {
  ctx.strokeStyle = c.secondary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-15, 55);
  ctx.lineTo(-12, 95);
  ctx.moveTo(15, 55);
  ctx.lineTo(12, 95);
  ctx.stroke();

  // Collar line
  ctx.beginPath();
  ctx.moveTo(-25, 95);
  ctx.lineTo(25, 95);
  ctx.stroke();
};

// ── Head ─────────────────────────────────────────

Aether.Orb.prototype._drawHead = function(ctx, c) {
  var pulse = 1 + Math.sin(this.frame * 0.03) * 0.03;

  // Hexagonal head outline
  var hw = 42 * pulse;
  var hh = 52 * pulse;
  var top = -58 * pulse;
  var bot = 46 * pulse;

  ctx.strokeStyle = c.primary;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = c.primary.replace('0.9', '0.5').replace('0.95', '0.5');
  ctx.shadowBlur = 8;

  // Rounded hexagon
  ctx.beginPath();
  var pts = [
    [0, top], [hw, top + 15], [hw, bot - 15], [0, bot],
    [-hw, bot - 15], [-hw, top + 15]
  ];
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (var i = 1; i < 6; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();
  ctx.stroke();

  // Inner glow line
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = 1;
  ctx.shadowBlur = 3;
  ctx.beginPath();
  var inner = 0.92;
  ctx.moveTo(pts[0][0] * inner, pts[0][1] * inner);
  for (var j = 1; j < 6; j++) {
    ctx.lineTo(pts[j][0] * inner, pts[j][1] * inner);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.shadowBlur = 0;
};

// ── Eyes ─────────────────────────────────────────

Aether.Orb.prototype._drawEyes = function(ctx, c) {
  var eyeY = -15;
  var eyeGap = 16;
  var eyeW = 14;
  var eyeH = this.blinking > 0.5 ? 1.5 : 8;

  // Listening: eyes wider
  if (this.state === 'listening') { eyeH *= 1.3; eyeW *= 1.05; }
  // Thinking: eyes narrower
  if (this.state === 'thinking') { eyeH *= 0.65; eyeW *= 0.95; }

  // Left eye
  var lx = -eyeGap + this.eyeLookX * 3;
  var ly = eyeY + this.eyeLookY * 2;
  this._drawEye(ctx, lx, ly, eyeW, eyeH, c);
  // Right eye
  var rx = eyeGap + this.eyeLookX * 3;
  var ry = eyeY + this.eyeLookY * 2;
  this._drawEye(ctx, rx, ry, eyeW, eyeH, c);
};

Aether.Orb.prototype._drawEye = function(ctx, x, y, w, h, c) {
  // Outer eye shape
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeStyle = c.primary;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Iris/pupil glow
  var glowGrad = ctx.createRadialGradient(x, y - 1, 1, x, y, w * 0.7);
  glowGrad.addColorStop(0, c.primary);
  glowGrad.addColorStop(0.5, c.secondary);
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(x, y, w * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Pupil dot
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + this.eyeLookX * 2, y + this.eyeLookY * 1.5, 2, 0, Math.PI * 2);
  ctx.fill();
};

// ── Nose ─────────────────────────────────────────

Aether.Orb.prototype._drawNose = function(ctx, c) {
  ctx.strokeStyle = c.secondary;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 8);
  ctx.moveTo(-4, 8);
  ctx.lineTo(4, 8);
  ctx.stroke();
};

// ── Mouth ────────────────────────────────────────

Aether.Orb.prototype._drawMouth = function(ctx, c) {
  var my = 20;
  var open = this.mouthOpen;

  if (open < 0.02) {
    // Closed: thin line
    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-12, my);
    ctx.lineTo(12, my);
    ctx.stroke();
  } else {
    // Open: ellipse
    var mw = 14 + open * 3;
    var mh = open * 10;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, my + mh * 0.5, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner glow
    var innerGrad = ctx.createRadialGradient(0, my + mh * 0.3, 0, 0, my + mh * 0.5, mh * 0.8);
    innerGrad.addColorStop(0, c.glow.replace('0.15', '0.25').replace('0.12', '0.2').replace('0.1', '0.18'));
    innerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.ellipse(0, my + mh * 0.5, mw * 0.9, mh * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Error: frown lines
  if (this.state === 'error') {
    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-20, my - 12);
    ctx.lineTo(-9, my);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(20, my - 12);
    ctx.lineTo(9, my);
    ctx.stroke();
  }
};

// ── Scan Lines ───────────────────────────────────

Aether.Orb.prototype._drawScanLines = function(ctx, c) {
  var t = this.frame * 0.02;
  ctx.strokeStyle = c.accent.replace('0.3', '0.08').replace('0.35', '0.1').replace('0.25', '0.06');
  ctx.lineWidth = 0.5;

  for (var i = -60; i <= 60; i += 12) {
    var y = i + (t % 12);
    if (y < -55 || y > 50) continue;
    ctx.beginPath();
    ctx.moveTo(-40, y);
    ctx.lineTo(40, y);
    ctx.stroke();
  }
};

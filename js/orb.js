// Aether — orb.js → Sci-fi AI Human Face
// Canvas-based holographic human face: realistic proportions, sci-fi neon glow
// API unchanged: Aether.Orb(canvasId), setState, pulse
var Aether = window.Aether || {};

Aether.Orb = function(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.state = 'idle';
  this.frame = 0;
  this.animId = null;

  this.reactivity = 0;
  this.targetReactivity = 0;
  this.mouthOpen = 0;
  this.mouthTarget = 0;

  // Eye movement
  this.eyeLookX = 0; this.eyeLookY = 0;
  this.eyeTargetX = 0; this.eyeTargetY = 0;

  // Blink
  this.blinkTimer = 80 + Math.random() * 120;
  this.blinking = 0;

  // Micro-head movement
  this.headTilt = 0;
  this.headNod = 0;

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
  if (dpr > 2) dpr = 2;
  this.canvas.width = size * dpr;
  this.canvas.height = size * dpr;
  this.canvas.style.width = size + 'px';
  this.canvas.style.height = size + 'px';
  this.size = size;
  this.cx = size / 2;
  this.cy = size / 2;
};

// ── Animation ────────────────────────────────────

Aether.Orb.prototype._startLoop = function() {
  var self = this;
  (function animate() {
    self.frame++;
    self._update();
    self._draw();
    self.animId = requestAnimationFrame(animate);
  })();
};

Aether.Orb.prototype._update = function() {
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.12;

  // Mouth during speech
  if (this.state === 'speaking') {
    this.mouthTarget = 0.35 + Math.sin(this.frame * 0.22) * 0.2 + Math.abs(Math.sin(this.frame * 0.13)) * 0.45;
  } else if (this.state === 'idle') {
    this.mouthTarget = Math.sin(this.frame * 0.015) * 0.03;
  } else {
    this.mouthTarget = 0;
  }
  this.mouthOpen += (this.mouthTarget - this.mouthOpen) * 0.25;

  // Eye tracking
  if (this.frame % 50 === 0) {
    this.eyeTargetX = (Math.random() - 0.5) * 0.1;
    this.eyeTargetY = (Math.random() - 0.5) * 0.06;
  }
  this.eyeLookX += (this.eyeTargetX - this.eyeLookX) * 0.08;
  this.eyeLookY += (this.eyeTargetY - this.eyeLookY) * 0.08;

  // Blink
  this.blinkTimer--;
  if (this.blinkTimer <= 0) { this.blinking = 1; this.blinkTimer = 100 + Math.random() * 180; }
  if (this.blinking > 0) this.blinking -= 0.12;

  // Micro head movement (breathing / life)
  this.headNod = Math.sin(this.frame * 0.025) * 0.02;
  if (this.state === 'listening') this.headTilt = Math.sin(this.frame * 0.04) * 0.03;
  else this.headTilt += (0 - this.headTilt) * 0.05;
};

// ── Public API ───────────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;
  switch (state) {
    case 'idle':      this.targetReactivity = 0; break;
    case 'listening': this.targetReactivity = 0.6; break;
    case 'thinking':  this.targetReactivity = 0; break;
    case 'speaking':  this.targetReactivity = 0.35; break;
    case 'error':     this.targetReactivity = 0; break;
  }
};

Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') this.targetReactivity = Math.min(1, 0.4 + intensity * 0.6);
  if (this.state === 'thinking') this.targetReactivity = Math.min(1, intensity * 0.5);
};

// ── Colors ───────────────────────────────────────

Aether.Orb.prototype._c = function() {
  var r = this.reactivity;
  switch (this.state) {
    case 'idle':      return { p: '0,240,255',  a:0.9,  glow:0.12, s: '0,160,200',   sa:0.45 };
    case 'listening': return { p: '200,255,255',a:0.95, glow:0.22, s: '120,220,255', sa:0.55 };
    case 'thinking':  return { p: '255,80,255', a:0.9,  glow:0.15, s: '180,40,200',  sa:0.5  };
    case 'speaking':  return { p: '0,240,255',  a:0.9,  glow:0.14, s: '0,170,210',   sa:0.45 };
    case 'error':     return { p: '255,68,102', a:0.9,  glow:0.1,  s: '180,40,60',   sa:0.4  };
    default:          return { p: '0,240,255',  a:0.9,  glow:0.12, s: '0,160,200',   sa:0.45 };
  }
};

// ── Main Draw ────────────────────────────────────

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx, dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, this.size, this.size);

  var s = this.size / 220;
  var c = this._c();

  ctx.save();
  ctx.translate(this.cx, this.cy + this.headNod * 10 * s);
  ctx.rotate(this.headTilt);
  ctx.scale(s, s);

  this._bgGlow(ctx, c);
  this._shoulders(ctx, c);
  this._neck(ctx, c);
  this._headShape(ctx, c);
  this._hair(ctx, c);
  this._ears(ctx, c);
  this._eyebrows(ctx, c);
  this._eyes(ctx, c);
  this._nose(ctx, c);
  this._mouth(ctx, c);
  this._jawline(ctx, c);
  this._scanLines(ctx, c);

  ctx.restore();
  ctx.restore();
};

// ── Parts ────────────────────────────────────────

Aether.Orb.prototype._bgGlow = function(ctx, c) {
  var r = 95 + Math.sin(this.frame * 0.02) * 8;
  var g = ctx.createRadialGradient(0, 5, r * 0.3, 0, 5, r);
  g.addColorStop(0, 'rgba(' + c.p + ',' + c.glow + ')');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 5, r, 0, Math.PI * 2); ctx.fill();
};

Aether.Orb.prototype._shoulders = function(ctx, c) {
  ctx.fillStyle = 'rgba(' + c.p + ',0.04)';
  ctx.strokeStyle = 'rgba(' + c.s + ',' + c.sa + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-65, 92); ctx.quadraticCurveTo(-40, 78, -28, 68);
  ctx.lineTo(28, 68); ctx.quadraticCurveTo(40, 78, 65, 92);
  ctx.quadraticCurveTo(70, 100, 75, 108);
  ctx.lineTo(-75, 108); ctx.quadraticCurveTo(-70, 100, -65, 92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Collarbone hint
  ctx.beginPath();
  ctx.moveTo(-28, 68); ctx.quadraticCurveTo(0, 76, 28, 68);
  ctx.stroke();
};

Aether.Orb.prototype._neck = function(ctx, c) {
  ctx.strokeStyle = 'rgba(' + c.s + ',' + c.sa + ')';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, 28); ctx.quadraticCurveTo(-12, 45, -18, 65);
  ctx.moveTo(10, 28); ctx.quadraticCurveTo(12, 45, 18, 65);
  ctx.stroke();

  // Neck fill
  ctx.fillStyle = 'rgba(' + c.p + ',0.03)';
  ctx.beginPath();
  ctx.moveTo(-10, 28); ctx.quadraticCurveTo(-12, 45, -18, 65);
  ctx.lineTo(18, 65); ctx.quadraticCurveTo(12, 45, 10, 28);
  ctx.closePath(); ctx.fill();
};

Aether.Orb.prototype._headShape = function(ctx, c) {
  // Oval face
  ctx.fillStyle = 'rgba(' + c.p + ',0.04)';
  ctx.strokeStyle = 'rgba(' + c.p + ',' + c.a + ')';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(' + c.p + ',0.4)'; ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(0, -2, 36, 48, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;

  // Chin definition
  ctx.strokeStyle = 'rgba(' + c.s + ',0.3)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 40, 12, 0.2, Math.PI - 0.2);
  ctx.stroke();
};

Aether.Orb.prototype._hair = function(ctx, c) {
  // Geometric hair silhouette — angled cuts
  ctx.strokeStyle = 'rgba(' + c.p + ',0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // Hairline curve
  ctx.moveTo(-30, -40); ctx.quadraticCurveTo(0, -52, 30, -40);
  // Right side
  ctx.quadraticCurveTo(38, -30, 36, -10);
  ctx.quadraticCurveTo(37, 5, 34, 18);
  ctx.moveTo(-30, -40);
  // Left side
  ctx.quadraticCurveTo(-38, -30, -36, -10);
  ctx.quadraticCurveTo(-37, 5, -34, 18);
  ctx.stroke();

  // Hair fill
  ctx.fillStyle = 'rgba(' + c.p + ',0.05)';
  ctx.beginPath();
  ctx.moveTo(-30, -40); ctx.quadraticCurveTo(0, -52, 30, -40);
  ctx.quadraticCurveTo(38, -30, 36, -10); ctx.quadraticCurveTo(37, 5, 34, 18);
  ctx.lineTo(35, -10); ctx.lineTo(-35, -10); ctx.lineTo(-34, 18);
  ctx.quadraticCurveTo(-37, 5, -36, -10); ctx.quadraticCurveTo(-38, -30, -30, -40);
  ctx.fill();
};

Aether.Orb.prototype._ears = function(ctx, c) {
  ctx.strokeStyle = 'rgba(' + c.s + ',0.3)';
  ctx.lineWidth = 0.9;
  // Left ear
  ctx.beginPath(); ctx.ellipse(-35, -2, 4, 9, -0.15, 0, Math.PI * 2); ctx.stroke();
  // Right ear
  ctx.beginPath(); ctx.ellipse(35, -2, 4, 9, 0.15, 0, Math.PI * 2); ctx.stroke();
};

Aether.Orb.prototype._eyebrows = function(ctx, c) {
  var browY = -22;
  ctx.strokeStyle = 'rgba(' + c.p + ',' + (c.a * 0.7) + ')';
  ctx.lineWidth = 1.4;
  // Left brow
  ctx.beginPath(); ctx.moveTo(-24, browY - 2); ctx.quadraticCurveTo(-14, browY - 6, -6, browY); ctx.stroke();
  // Right brow
  ctx.beginPath(); ctx.moveTo(24, browY - 2); ctx.quadraticCurveTo(14, browY - 6, 6, browY); ctx.stroke();

  // Error: furrowed
  if (this.state === 'error') {
    ctx.beginPath(); ctx.moveTo(-24, browY - 4); ctx.quadraticCurveTo(-15, browY, -7, browY + 1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, browY - 4); ctx.quadraticCurveTo(15, browY, 7, browY + 1); ctx.stroke();
  }
};

Aether.Orb.prototype._eyes = function(ctx, c) {
  var ey = -10, gap = 14;
  var ew = 12, eh = this.blinking > 0.4 ? 1.5 : 6.5;

  if (this.state === 'listening') { eh *= 1.25; ew *= 1.04; }
  if (this.state === 'thinking') { eh *= 0.6; }
  if (this.state === 'error') { eh *= 0.7; }

  // Left eye
  this._eye(ctx, -gap + this.eyeLookX * 2.5, ey + this.eyeLookY * 1.5, ew, eh, c);
  // Right eye
  this._eye(ctx, gap + this.eyeLookX * 2.5, ey + this.eyeLookY * 1.5, ew, eh, c);
};

Aether.Orb.prototype._eye = function(ctx, x, y, w, h, c) {
  // Eye socket shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y, w + 2, h + 2, 0, 0, Math.PI * 2); ctx.fill();

  // Eye white
  ctx.fillStyle = 'rgba(' + c.p + ',0.12)';
  ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fill();

  // Iris ring
  var ir = w * 0.4;
  var grad = ctx.createRadialGradient(x, y - 0.5, 0, x, y, ir);
  grad.addColorStop(0, 'rgba(' + c.p + ',1)');
  grad.addColorStop(0.6, 'rgba(' + c.s + ',0.7)');
  grad.addColorStop(1, 'rgba(' + c.p + ',0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(x, y, ir, 0, Math.PI * 2); ctx.fill();

  // Pupil
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(x + this.eyeLookX * 1.5, y + this.eyeLookY, 1.8, 0, Math.PI * 2); ctx.fill();

  // Specular highlight
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(x + 1.5, y - 2, 1.2, 0, Math.PI * 2); ctx.fill();

  // Eyelid line (upper)
  ctx.strokeStyle = 'rgba(' + c.p + ',0.5)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.ellipse(x, y, w, h, 0, Math.PI, 0);
  ctx.stroke();
};

Aether.Orb.prototype._nose = function(ctx, c) {
  var ny = 8;
  ctx.strokeStyle = 'rgba(' + c.s + ',0.35)';
  ctx.lineWidth = 0.8;

  // Nose bridge
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.quadraticCurveTo(-1, -4, 0, 8);
  ctx.stroke();

  // Nostrils
  ctx.beginPath();
  ctx.ellipse(-4, 8, 3, 1.8, 0.1, 0, Math.PI, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(4, 8, 3, 1.8, -0.1, 0, Math.PI, false);
  ctx.stroke();

  // Nose tip glow
  ctx.fillStyle = 'rgba(' + c.p + ',0.06)';
  ctx.beginPath(); ctx.ellipse(0, 6, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
};

Aether.Orb.prototype._mouth = function(ctx, c) {
  var my = 22, open = Math.max(0, this.mouthOpen);

  if (open < 0.03) {
    // Closed lips
    ctx.strokeStyle = 'rgba(' + c.p + ',0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    // Upper lip (cupid's bow)
    ctx.moveTo(-12, my - 1); ctx.quadraticCurveTo(-4, my - 4, 0, my - 2);
    ctx.quadraticCurveTo(4, my - 4, 12, my - 1);
    ctx.stroke();
    // Lower lip
    ctx.beginPath();
    ctx.moveTo(-12, my + 1); ctx.quadraticCurveTo(0, my + 4, 12, my + 1);
    ctx.stroke();
  } else {
    // Open mouth
    var mh = open * 12;
    var mw = 13 + open * 2;

    // Mouth interior
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, my + 2, mw, mh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    var ig = ctx.createRadialGradient(0, my, 0, 0, my + mh * 0.4, mh * 0.7);
    ig.addColorStop(0, 'rgba(' + c.p + ',0.2)');
    ig.addColorStop(1, 'transparent');
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.ellipse(0, my + 2, mw * 0.85, mh * 0.7, 0, 0, Math.PI * 2); ctx.fill();

    // Teeth hint (top)
    ctx.fillStyle = 'rgba(' + c.p + ',0.15)';
    ctx.beginPath(); ctx.ellipse(0, my - mh * 0.3, mw * 0.7, mh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  }
};

Aether.Orb.prototype._jawline = function(ctx, c) {
  ctx.strokeStyle = 'rgba(' + c.s + ',0.25)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-32, 10); ctx.quadraticCurveTo(0, 46, 32, 10);
  ctx.stroke();
};

Aether.Orb.prototype._scanLines = function(ctx, c) {
  var t = this.frame * 0.02;
  ctx.strokeStyle = 'rgba(' + c.p + ',0.06)';
  ctx.lineWidth = 0.4;

  for (var i = -65; i <= 65; i += 10) {
    var y = i + (t % 10);
    if (y < -55 || y > 55) continue;
    ctx.beginPath(); ctx.moveTo(-42, y); ctx.lineTo(42, y); ctx.stroke();
  }
};

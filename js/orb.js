// Aether — orb.js → Cyber Visor Face
// Stylized sci-fi visor/helmet: Neon HUD face, fully canvas-drawn, pixel-perfect alignment
// API unchanged: Aether.Orb(canvasId), setState, pulse
var Aether = window.Aether || {};

Aether.Orb = function(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.state = 'idle';
  this.frame = 0; this.animId = null;
  this.reactivity = 0; this.targetReactivity = 0;
  this.mouthOpen = 0; this.mouthTarget = 0;
  this.eyeGlow = 0; this.eyeTarget = 0;
  this.blinkTimer = 120; this.blinking = 0;
  this.particles = [];
  this.hudRings = [];

  this._resize();
  this._startLoop();
  var self = this;
  window.addEventListener('resize', function(){self._resize();});
};

// ── Sizing ────────────────────────────────────────

Aether.Orb.prototype._resize = function() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var size = this.canvas.parentElement.clientHeight || 220;
  this.canvas.width = size * dpr;
  this.canvas.height = size * dpr;
  this.canvas.style.width = size + 'px';
  this.canvas.style.height = size + 'px';
  this.size = size; this.cx = size / 2; this.cy = size / 2;
};

// ── Animation ────────────────────────────────────

Aether.Orb.prototype._startLoop = function() {
  var self = this;
  (function a(){ self.frame++; self._update(); self._draw(); self.animId = requestAnimationFrame(a); })();
};

Aether.Orb.prototype._update = function() {
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.12;

  if (this.state === 'speaking') {
    this.mouthTarget = 0.25 + Math.sin(this.frame * 0.22) * 0.2 + Math.abs(Math.sin(this.frame * 0.13)) * 0.55;
    this.eyeTarget = 0.7 + Math.sin(this.frame * 0.1) * 0.3;
  } else if (this.state === 'idle') {
    this.mouthTarget = Math.sin(this.frame * 0.015) * 0.02;
    this.eyeTarget = 0.4 + Math.sin(this.frame * 0.012) * 0.15;
  } else if (this.state === 'listening') {
    this.mouthTarget = 0;
    this.eyeTarget = 0.8 + this.reactivity * 0.2;
  } else {
    this.mouthTarget = 0;
    this.eyeTarget = this.state === 'thinking' ? 0.5 + Math.sin(this.frame * 0.08) * 0.3 : 0.35;
  }
  this.mouthOpen += (this.mouthTarget - this.mouthOpen) * 0.2;
  this.eyeGlow += (this.eyeTarget - this.eyeGlow) * 0.15;

  this.blinkTimer--;
  if (this.blinkTimer <= 0) { this.blinking = 1; this.blinkTimer = 100 + Math.random() * 200; }
  if (this.blinking > 0) this.blinking -= 0.1;

  // HUD spin rings
  if (this.frame % 60 === 0 && this.hudRings.length < 3) {
    this.hudRings.push({ r: 30, alpha: 0.6, speed: 0.015 + Math.random() * 0.02, a: Math.random() * Math.PI * 2 });
  }
  for (var i = this.hudRings.length - 1; i >= 0; i--) {
    var hr = this.hudRings[i];
    hr.a += hr.speed; hr.alpha -= 0.005;
    if (hr.alpha <= 0) this.hudRings.splice(i, 1);
  }

  // Ambient particles
  if (this.frame % 10 === 0 && this.particles.length < 15) {
    this.particles.push({
      x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60,
      life: 1, size: 0.5 + Math.random() * 1.5
    });
  }
  for (var j = this.particles.length - 1; j >= 0; j--) {
    this.particles[j].life -= 0.02;
    if (this.particles[j].life <= 0) this.particles.splice(j, 1);
  }
};

// ── Public API ───────────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;
  switch (state) {
    case 'idle': this.targetReactivity = 0; break;
    case 'listening': this.targetReactivity = 0.6; break;
    case 'thinking': this.targetReactivity = 0; break;
    case 'speaking': this.targetReactivity = 0.3; break;
    case 'error': this.targetReactivity = 0; break;
  }
};

Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') this.targetReactivity = Math.min(1, 0.3 + intensity * 0.7);
  if (this.state === 'thinking') this.targetReactivity = Math.min(1, intensity * 0.5);
};

// ── Colors ───────────────────────────────────────

Aether.Orb.prototype._c = function() {
  switch (this.state) {
    case 'idle':      return {p:'0,240,255', a:'0.9', s:'0,160,210', sa:'0.45', g:'0,240,255', ga:'0.12'};
    case 'listening': return {p:'180,255,255', a:'0.95', s:'100,220,255', sa:'0.55', g:'200,255,255', ga:'0.2'};
    case 'thinking':  return {p:'255,80,255', a:'0.85', s:'180,50,210', sa:'0.5', g:'255,80,255', ga:'0.14'};
    case 'speaking':  return {p:'0,240,255', a:'0.9', s:'0,170,220', sa:'0.45', g:'0,240,255', ga:'0.12'};
    case 'error':     return {p:'255,68,102', a:'0.85', s:'190,40,60', sa:'0.4', g:'255,68,102', ga:'0.08'};
    default:          return {p:'0,240,255', a:'0.9', s:'0,160,210', sa:'0.45', g:'0,240,255', ga:'0.12'};
  }
};

// ═══════════════════════════════════════════════════
//  MAIN DRAW
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx, dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, this.size, this.size);

  var c = this._c();
  var s = this.size / 200; // scale to fit 200px design

  ctx.save();
  ctx.translate(this.cx, this.cy);
  ctx.scale(s, s);

  this._bgGlow(ctx, c);
  this._visorOutline(ctx, c);
  this._eyeSlits(ctx, c);
  this._mouthLine(ctx, c);
  this._cheekCircuits(ctx, c);
  this._hudElements(ctx, c);
  this._particlesFloating(ctx, c);

  ctx.restore();
  ctx.restore();
};

// ── Background Glow ──────────────────────────────

Aether.Orb.prototype._bgGlow = function(ctx, c) {
  var pulse = 1 + Math.sin(this.frame * 0.02) * 0.06;
  var r = 90 * pulse;
  var g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
  g.addColorStop(0, 'rgba(' + c.g + ',' + c.ga + ')');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
};

// ── Visor Helmet Outline ─────────────────────────

Aether.Orb.prototype._visorOutline = function(ctx, c) {
  // Main visor shape — sleek diamond/hex hybrid
  ctx.save();

  // Outer glow field
  var outGlow = ctx.createRadialGradient(0, -5, 20, 0, 0, 75);
  outGlow.addColorStop(0, 'rgba(' + c.p + ',0.08)');
  outGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outGlow;
  ctx.beginPath(); ctx.arc(0, 0, 75, 0, Math.PI * 2); ctx.fill();

  // Visor body — angular helm shape
  var vw = 50, vh = 60;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeStyle = 'rgba(' + c.p + ',0.7)';
  ctx.lineWidth = 1.8;
  ctx.shadowColor = 'rgba(' + c.p + ',0.5)'; ctx.shadowBlur = 10;

  ctx.beginPath();
  // Top point
  ctx.moveTo(0, -vh);
  // Right side
  ctx.lineTo(vw, -30);
  ctx.lineTo(vw - 5, 10);
  ctx.lineTo(vw - 15, 35);
  ctx.quadraticCurveTo(0, 48, -vw + 15, 35);
  ctx.lineTo(-vw + 5, 10);
  ctx.lineTo(-vw, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner visor faceplate
  ctx.strokeStyle = 'rgba(' + c.s + ',0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  var iv = 0.85;
  ctx.moveTo(0, -vh * iv);
  ctx.lineTo(vw * iv, -30 * iv);
  ctx.lineTo((vw - 5) * iv, 10 * iv);
  ctx.lineTo((vw - 15) * iv, 35 * iv);
  ctx.quadraticCurveTo(0, 48 * iv, (-vw + 15) * iv, 35 * iv);
  ctx.lineTo((-vw + 5) * iv, 10 * iv);
  ctx.lineTo(-vw * iv, -30 * iv);
  ctx.closePath();
  ctx.stroke();

  // Forehead chevron
  ctx.strokeStyle = 'rgba(' + c.p + ',0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-15, -40); ctx.lineTo(0, -35); ctx.lineTo(15, -40);
  ctx.stroke();

  ctx.restore();
};

// ── Eye slits (visor eyes) ───────────────────────

Aether.Orb.prototype._eyeSlits = function(ctx, c) {
  var ey = -18, ew = 18, eg = 18;

  // Left eye
  this._eyeSlit(ctx, -eg, ey, ew, c);
  // Right eye
  this._eyeSlit(ctx, eg, ey, ew, c);
};

Aether.Orb.prototype._eyeSlit = function(ctx, x, y, w, c) {
  var h = this.blinking > 0.5 ? 1 : 4;
  if (this.state === 'listening') h = 5;
  if (this.state === 'thinking') h = 2.5;

  // Eye glow background
  var glowGrad = ctx.createRadialGradient(x, y, 1, x, y, w * 0.6);
  glowGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
  glowGrad.addColorStop(0.3, 'rgba(' + c.p + ',' + this.eyeGlow + ')');
  glowGrad.addColorStop(1, 'rgba(' + c.p + ',0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.ellipse(x, y, w + 2, h + 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sharp slit
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = 'rgba(' + c.p + ',0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  // Angular slit shape
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w * 0.6, y - h);
  ctx.lineTo(x + w * 0.6, y - h);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w * 0.6, y + h);
  ctx.lineTo(x - w * 0.6, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // HUD corner brackets
  ctx.strokeStyle = 'rgba(' + c.p + ',0.5)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x - w - 4, y - h - 2); ctx.lineTo(x - w - 4, y - h - 8); ctx.lineTo(x - w + 2, y - h - 8);
  ctx.moveTo(x + w + 4, y - h - 2); ctx.lineTo(x + w + 4, y - h - 8); ctx.lineTo(x + w - 2, y - h - 8);
  ctx.stroke();
};

// ── Mouth line ───────────────────────────────────

Aether.Orb.prototype._mouthLine = function(ctx, c) {
  var my = 30, mw = 28;
  var open = Math.max(0, this.mouthOpen);

  if (open < 0.03) {
    // Single neon line
    ctx.strokeStyle = 'rgba(' + c.p + ',0.8)';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(' + c.p + ',0.5)'; ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(-mw, my); ctx.lineTo(-mw * 0.5, my - 1); ctx.lineTo(mw * 0.5, my - 1); ctx.lineTo(mw, my);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else {
    // Split open — two halves
    var gap = open * 16;
    ctx.strokeStyle = 'rgba(' + c.p + ',0.8)';
    ctx.lineWidth = 1.3;
    ctx.shadowColor = 'rgba(' + c.p + ',0.5)'; ctx.shadowBlur = 6;

    // Upper half
    ctx.beginPath();
    ctx.moveTo(-mw, my - gap * 0.4); ctx.quadraticCurveTo(0, my - gap * 0.7, mw, my - gap * 0.4);
    ctx.stroke();

    // Lower half
    ctx.strokeStyle = 'rgba(' + c.p + ',0.6)';
    ctx.beginPath();
    ctx.moveTo(-mw, my + gap * 0.4); ctx.quadraticCurveTo(0, my + gap * 0.7, mw, my + gap * 0.4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner energy glow between lips
    if (gap > 3) {
      var innerGlow = ctx.createLinearGradient(0, my - gap * 0.5, 0, my + gap * 0.5);
      innerGlow.addColorStop(0, 'rgba(' + c.p + ',0.3)');
      innerGlow.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      innerGlow.addColorStop(1, 'rgba(' + c.p + ',0.3)');
      ctx.fillStyle = innerGlow;
      ctx.beginPath();
      ctx.ellipse(0, my, mw - 2, gap * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vertical energy bolts
    if (open > 0.4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.4;
      for (var j = -3; j <= 3; j++) {
        ctx.beginPath();
        ctx.moveTo(j * 5, my - gap * 0.45);
        ctx.lineTo(j * 4.5, my + gap * 0.45);
        ctx.stroke();
      }
    }
  }
};

// ── Cheek circuits ───────────────────────────────

Aether.Orb.prototype._cheekCircuits = function(ctx, c) {
  ctx.strokeStyle = 'rgba(' + c.s + ',0.25)';
  ctx.lineWidth = 0.6;

  // Left cheek
  ctx.beginPath();
  ctx.moveTo(-40, 5); ctx.lineTo(-35, 12);
  ctx.lineTo(-38, 20); ctx.lineTo(-33, 28);
  ctx.stroke();

  // Right cheek
  ctx.beginPath();
  ctx.moveTo(40, 5); ctx.lineTo(35, 12);
  ctx.lineTo(38, 20); ctx.lineTo(33, 28);
  ctx.stroke();

  // Jaw circuits
  ctx.strokeStyle = 'rgba(' + c.p + ',0.2)';
  ctx.beginPath();
  ctx.moveTo(-30, 35); ctx.lineTo(-15, 42); ctx.lineTo(0, 44);
  ctx.lineTo(15, 42); ctx.lineTo(30, 35);
  ctx.stroke();
};

// ── HUD elements ─────────────────────────────────

Aether.Orb.prototype._hudElements = function(ctx, c) {
  var t = this.frame * 0.03;

  // Corner brackets (targeting reticle style)
  ctx.strokeStyle = 'rgba(' + c.p + ',0.35)';
  ctx.lineWidth = 1;
  var br = 65;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(-br, -45); ctx.lineTo(-br, -55); ctx.lineTo(-br + 10, -55);
  ctx.moveTo(-br, -45); ctx.lineTo(-br, -35); ctx.lineTo(-br + 10, -35);
  // Top-right
  ctx.moveTo(br, -45); ctx.lineTo(br, -55); ctx.lineTo(br - 10, -55);
  ctx.moveTo(br, -45); ctx.lineTo(br, -35); ctx.lineTo(br - 10, -35);
  // Bottom-left
  ctx.moveTo(-br, 45); ctx.lineTo(-br, 55); ctx.lineTo(-br + 10, 55);
  ctx.moveTo(-br, 45); ctx.lineTo(-br, 35); ctx.lineTo(-br + 10, 35);
  // Bottom-right
  ctx.moveTo(br, 45); ctx.lineTo(br, 55); ctx.lineTo(br - 10, 55);
  ctx.moveTo(br, 45); ctx.lineTo(br, 35); ctx.lineTo(br - 10, 35);
  ctx.stroke();

  // Spinning targeting circle
  for (var i = 0; i < this.hudRings.length; i++) {
    var hr = this.hudRings[i];
    ctx.strokeStyle = 'rgba(' + c.p + ',' + hr.alpha + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, -5, 55 + hr.r * 0.2, hr.a, hr.a + Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -5, 55 + hr.r * 0.2, hr.a + Math.PI, hr.a + Math.PI * 0.5);
    ctx.stroke();
  }

  // Scanning horizontal line
  var scanY = -50 + ((this.frame * 0.8) % 100);
  var scanAlpha = scanY > -10 && scanY < 40 ? 0.3 : 0.08;
  ctx.strokeStyle = 'rgba(' + c.p + ',' + scanAlpha + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-60, scanY); ctx.lineTo(60, scanY);
  ctx.stroke();
  // Scan line glow
  ctx.fillStyle = 'rgba(' + c.p + ',' + (scanAlpha * 0.5) + ')';
  ctx.fillRect(-60, scanY - 1, 120, 2);
};

// ── Floating particles ───────────────────────────

Aether.Orb.prototype._particlesFloating = function(ctx, c) {
  for (var i = 0; i < this.particles.length; i++) {
    var p = this.particles[i];
    ctx.fillStyle = 'rgba(' + c.p + ',' + (p.life * 0.4) + ')';
    ctx.shadowColor = 'rgba(' + c.p + ',' + (p.life * 0.3) + ')';
    ctx.shadowBlur = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
};

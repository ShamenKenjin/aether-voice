// Aether — orb.js → Photorealistic AI Face V4
// Multi-image mouth blend + canvas composite + full sci-fi effects
// API unchanged: Aether.Orb(canvasId), setState, pulse
var Aether = window.Aether || {};

Aether.Orb = function(canvasId) {
  this.canvas = document.getElementById(canvasId);
  this.ctx = this.canvas.getContext('2d');
  this.state = 'idle';
  this.frame = 0;
  this.animId = null;
  this.reactivity = 0; this.targetReactivity = 0;
  this.mouthOpen = 0; this.mouthTarget = 0;
  this.eyeLookX = 0; this.eyeLookY = 0;
  this.eyeTargetX = 0; this.eyeTargetY = 0;
  this.blinkTimer = 100; this.blinking = 0;

  // Face images: [closed, half-open, full-open] — crossfade for mouth animation
  this.images = [null, null, null];
  this.imagesLoaded = [false, false, false];
  this._loadImages();

  // Landmarks (% of 1024x1024 image)
  this.lm = {
    leftEye:{x:0.366,y:0.460}, rightEye:{x:0.634,y:0.460},
    mouth:{x:0.500,y:0.758}, mouthW:0.22,
    faceC:{x:0.500,y:0.515}, faceW:0.64, nose:{x:0.500,y:0.592}
  };

  // Effects state
  this.glitchActive = false; this.glitchTimer = 0;
  this.circuitParticles = [];

  this._resize();
  this._startLoop();
  var self = this;
  window.addEventListener('resize', function(){self._resize();});
};

// ── Load 3 face images ───────────────────────────

Aether.Orb.prototype._loadImages = function() {
  var paths = ['assets/ai-face.png', 'assets/mouth-half.png', 'assets/mouth-open.png'];
  for (var i = 0; i < 3; i++) {
    var img = new Image();
    var idx = i;
    var self = this;
    img.onload = function() { self.imagesLoaded[idx] = true; };
    img.src = paths[i];
    this.images[i] = img;
  }
};

// ── Canvas sizing ────────────────────────────────

Aether.Orb.prototype._resize = function() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var size = this.canvas.parentElement.clientHeight || 220;
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
  (function a(){ self.frame++; self._update(); self._draw(); self.animId = requestAnimationFrame(a); })();
};

Aether.Orb.prototype._update = function() {
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.12;

  // Mouth
  if (this.state === 'speaking') {
    this.mouthTarget = 0.3 + Math.sin(this.frame * 0.22) * 0.2 + Math.abs(Math.sin(this.frame * 0.13)) * 0.5;
  } else if (this.state === 'idle') {
    this.mouthTarget = Math.sin(this.frame * 0.015) * 0.015;
  } else { this.mouthTarget = 0; }
  this.mouthOpen += (this.mouthTarget - this.mouthOpen) * 0.22;

  // Eyes
  if (this.frame % 50 === 0) {
    this.eyeTargetX = (Math.random() - 0.5) * 0.06;
    this.eyeTargetY = (Math.random() - 0.5) * 0.04;
  }
  this.eyeLookX += (this.eyeTargetX - this.eyeLookX) * 0.08;
  this.eyeLookY += (this.eyeTargetY - this.eyeLookY) * 0.08;

  // Blink
  this.blinkTimer--;
  if (this.blinkTimer <= 0) { this.blinking = 1; this.blinkTimer = 100 + Math.random() * 180; }
  if (this.blinking > 0) this.blinking -= 0.12;

  // Glitch
  if (this.glitchTimer > 0) this.glitchTimer--;
  if (this.frame % 180 === 0 && Math.random() < 0.3) { this.glitchActive = true; this.glitchTimer = 6; }
  else if (this.glitchTimer <= 0) this.glitchActive = false;

  // Circuit particles
  if (this.frame % 15 === 0 && this.circuitParticles.length < 8) {
    this.circuitParticles.push({
      x: (Math.random() - 0.5) * 90, y: (Math.random() - 0.5) * 90,
      vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2 - 0.5,
      life: 1, size: 0.5 + Math.random() * 1.5
    });
  }
  for (var i = this.circuitParticles.length - 1; i >= 0; i--) {
    var cp = this.circuitParticles[i];
    cp.x += cp.vx; cp.y += cp.vy; cp.life -= 0.015;
    if (cp.life <= 0) this.circuitParticles.splice(i, 1);
  }
};

// ── Public API ───────────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;
  switch (state) {
    case 'idle': this.targetReactivity = 0; break;
    case 'listening': this.targetReactivity = 0.5; break;
    case 'thinking': this.targetReactivity = 0; break;
    case 'speaking': this.targetReactivity = 0.3; break;
    case 'error': this.targetReactivity = 0; break;
  }
};

Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') this.targetReactivity = Math.min(1, 0.3 + intensity * 0.7);
  if (this.state === 'thinking') this.targetReactivity = Math.min(1, intensity * 0.5);
};

// ── Colors per state ─────────────────────────────

Aether.Orb.prototype._c = function() {
  switch (this.state) {
    case 'idle':      return {p:'0,240,255', a:0.9, s:'0,170,210', sa:0.5};
    case 'listening': return {p:'200,255,255', a:0.95, s:'130,230,255', sa:0.6};
    case 'thinking':  return {p:'255,80,255', a:0.85, s:'200,60,220', sa:0.5};
    case 'speaking':  return {p:'0,240,255', a:0.9, s:'0,180,220', sa:0.5};
    case 'error':     return {p:'255,68,102', a:0.85, s:'200,50,70', sa:0.45};
    default:          return {p:'0,240,255', a:0.9, s:'0,170,210', sa:0.5};
  }
};

// ── Coord mapper ─────────────────────────────────

Aether.Orb.prototype._map = function(lmx, lmy) {
  var fs = this.size, iw = fs * 0.9, ih = fs * 0.9;
  return { x: (fs - iw) / 2 + lmx * iw, y: (fs - ih) / 2 + lmy * ih };
};

// ═══════════════════════════════════════════════════
//  MAIN DRAW
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx, dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, this.size, this.size);

  var c = this._c();
  var open = Math.max(0, this.mouthOpen);

  // ── 1. Background glow (breathing) ────────────
  this._drawBgGlow(ctx, c);

  // ── 2. Face image with mouth blend ────────────
  this._drawFaceBlend(ctx, open);

  // ── 3. Canvas mouth composite (dark cavity + teeth) ──
  if (open > 0.05) this._drawMouthComposite(ctx, c, open);

  // ── 4. Eye highlights ─────────────────────────
  var le = this._map(this.lm.leftEye.x, this.lm.leftEye.y);
  var re = this._map(this.lm.rightEye.x, this.lm.rightEye.y);
  this._drawEyes(ctx, c, le, re);

  // ── 5. Effects ────────────────────────────────
  this._drawScanLines(ctx, c);
  this._drawCircuitParticles(ctx, c);
  if (this.glitchActive) this._drawGlitch(ctx, c);
  this._drawEdgeGlow(ctx, c);

  // ── 6. State rings ────────────────────────────
  if (this.state === 'listening') this._drawPulseRing(ctx, c);
  if (this.state === 'thinking') this._drawThinkingRing(ctx, c);

  ctx.restore();
};

// ═══════════════════════════════════════════════════
//  FACE BLEND (A: multi-image crossfade)
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._drawFaceBlend = function(ctx, open) {
  var fs = this.size, fw = fs * 0.9, fh = fs * 0.9;
  var fx = (fs - fw) / 2, fy = (fs - fh) / 2;

  // Circular clip
  ctx.save();
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, fs * 0.44, 0, Math.PI * 2);
  ctx.clip();

  // Blend between images based on mouthOpen (0→1)
  // open < 0.15: only image[0] (closed)
  // open 0.15-0.5: crossfade image[0] → image[1] (half)
  // open > 0.5: crossfade image[1] → image[2] (full open)

  var t; // blend factor 0→1 between two images
  var iA, iB, alphaA, alphaB;

  if (open < 0.15) {
    // Only closed mouth
    iA = 0; iB = 0; alphaA = 1; alphaB = 0;
    t = 0;
  } else if (open < 0.5) {
    // Closed → half-open
    t = (open - 0.15) / 0.35;
    iA = 0; iB = 1; alphaA = 1 - t; alphaB = t;
  } else {
    // Half-open → full-open
    t = Math.min(1, (open - 0.5) / 0.5);
    iA = 1; iB = 2; alphaA = 1 - t; alphaB = t;
  }

  // Draw base image
  if (this.imagesLoaded[iA] && this.images[iA]) {
    ctx.globalAlpha = alphaA;
    ctx.drawImage(this.images[iA], fx, fy, fw, fh);
  }
  // Draw blend image
  if (iA !== iB && this.imagesLoaded[iB] && this.images[iB]) {
    ctx.globalAlpha = alphaB;
    ctx.drawImage(this.images[iB], fx, fy, fw, fh);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
};

// ═══════════════════════════════════════════════════
//  MOUTH COMPOSITE (B: dark cavity + teeth)
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._drawMouthComposite = function(ctx, c, open) {
  var mo = this._map(this.lm.mouth.x, this.lm.mouth.y);
  var mw = this.lm.mouthW * this.size * 0.9;
  var mh = open * 16;
  var mww = mw * 0.45 * (1 + open * 0.25);

  // Dark cavity (erases the closed mouth from photo)
  var cavGrad = ctx.createRadialGradient(mo.x, mo.y, 0, mo.x, mo.y + mh * 0.3, mh);
  cavGrad.addColorStop(0, 'rgba(5,2,8,0.95)');
  cavGrad.addColorStop(0.5, 'rgba(10,5,15,0.85)');
  cavGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cavGrad;
  ctx.beginPath();
  ctx.ellipse(mo.x, mo.y + 1, mww, mh, 0, 0, Math.PI * 2);
  ctx.fill();

  // Teeth (upper)
  if (open > 0.15) {
    ctx.fillStyle = 'rgba(200,210,220,0.4)';
    ctx.beginPath();
    ctx.ellipse(mo.x, mo.y - mh * 0.35, mww * 0.7, mh * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // Teeth (lower) — visible when wider
    if (open > 0.4) {
      ctx.fillStyle = 'rgba(180,190,200,0.3)';
      ctx.beginPath();
      ctx.ellipse(mo.x, mo.y + mh * 0.25, mww * 0.6, mh * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Tongue hint (deep open)
  if (open > 0.5) {
    ctx.fillStyle = 'rgba(180,80,100,0.35)';
    ctx.beginPath();
    ctx.ellipse(mo.x, mo.y + mh * 0.35, mww * 0.4, mh * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lip highlights around mouth opening
  ctx.strokeStyle = 'rgba(' + c.p + ',0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Upper lip (cupid's bow)
  ctx.moveTo(mo.x - mww, mo.y - mh * 0.15);
  ctx.quadraticCurveTo(mo.x - mww * 0.5, mo.y - mh * 0.45, mo.x, mo.y - mh * 0.3);
  ctx.quadraticCurveTo(mo.x + mww * 0.5, mo.y - mh * 0.45, mo.x + mww, mo.y - mh * 0.15);
  ctx.stroke();
  // Lower lip
  ctx.beginPath();
  ctx.moveTo(mo.x - mww * 0.9, mo.y + mh * 0.15);
  ctx.quadraticCurveTo(mo.x, mo.y + mh * 0.4, mo.x + mww * 0.9, mo.y + mh * 0.15);
  ctx.stroke();
};

// ═══════════════════════════════════════════════════
//  EYES
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._drawEyes = function(ctx, c, le, re) {
  var alpha = 0.45;
  if (this.state === 'listening') alpha = 0.7 + this.reactivity * 0.2;
  if (this.state === 'thinking') alpha = 0.55;
  var eh = this.blinking > 0.4 ? 1 : 5;
  if (this.state === 'listening') eh *= 1.25;
  if (this.state === 'thinking') eh *= 0.55;

  [le, re].forEach(function(ep) {
    // Iris glow ring
    var ir = 5;
    var g = ctx.createRadialGradient(ep.x + this.eyeLookX * 4, ep.y + this.eyeLookY * 3, 0, ep.x, ep.y, ir);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.3, 'rgba(' + c.p + ',' + alpha + ')');
    g.addColorStop(1, 'rgba(' + c.p + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ep.x, ep.y, ir * 1.6, 0, Math.PI * 2); ctx.fill();

    // Pupil dot
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(ep.x + this.eyeLookX * 2, ep.y + this.eyeLookY * 1.5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(ep.x + 2, ep.y - 2.5, 1.3, 0, Math.PI * 2); ctx.fill();

    // Eyelid accent
    ctx.strokeStyle = 'rgba(' + c.p + ',0.4)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(ep.x, ep.y - 0.5, 13, eh, 0, Math.PI, 0);
    ctx.stroke();
  }.bind(this));
};

// ═══════════════════════════════════════════════════
//  EFFECTS
// ═══════════════════════════════════════════════════

Aether.Orb.prototype._drawBgGlow = function(ctx, c) {
  var pulse = 1 + Math.sin(this.frame * 0.02) * 0.06;
  var r = this.size * 0.44 * pulse;
  var a = 0.06;
  if (this.state === 'listening') a = 0.1 + this.reactivity * 0.12;
  if (this.state === 'thinking') a = 0.08;
  var g = ctx.createRadialGradient(this.cx, this.cy, r * 0.4, this.cx, this.cy, r);
  g.addColorStop(0, 'rgba(' + c.p + ',0)');
  g.addColorStop(0.6, 'rgba(' + c.p + ',' + a + ')');
  g.addColorStop(1, 'rgba(' + c.p + ',0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2); ctx.fill();
};

Aether.Orb.prototype._drawScanLines = function(ctx, c) {
  var t = this.frame * 0.025;
  ctx.strokeStyle = 'rgba(' + c.p + ',0.04)';
  ctx.lineWidth = 0.4;
  for (var y = -60; y <= 60; y += 9) {
    var yy = y + (t % 9);
    if (yy < -55 || yy > 55) continue;
    ctx.beginPath(); ctx.moveTo(this.cx - 42, this.cy + yy); ctx.lineTo(this.cx + 42, this.cy + yy); ctx.stroke();
  }
};

Aether.Orb.prototype._drawCircuitParticles = function(ctx, c) {
  for (var i = 0; i < this.circuitParticles.length; i++) {
    var cp = this.circuitParticles[i];
    var px = this.cx + cp.x, py = this.cy + cp.y;
    var alpha = cp.life * 0.5;
    ctx.fillStyle = 'rgba(' + c.p + ',' + alpha + ')';
    ctx.shadowColor = 'rgba(' + c.p + ',' + alpha + ')';
    ctx.shadowBlur = 4;
    ctx.beginPath(); ctx.arc(px, py, cp.size, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
};

Aether.Orb.prototype._drawGlitch = function(ctx, c) {
  // Random horizontal slice displacement
  var slices = 3;
  for (var i = 0; i < slices; i++) {
    var y = -40 + Math.random() * 80;
    var h = 3 + Math.random() * 6;
    var dx = (Math.random() - 0.5) * 8;
    // Draw displaced slice from existing canvas
    ctx.save();
    ctx.beginPath(); ctx.rect(this.cx - 40, this.cy + y, 80, h); ctx.clip();
    ctx.drawImage(this.canvas, dx, 0);
    ctx.restore();
    // Cyan scan line
    ctx.fillStyle = 'rgba(' + c.p + ',0.3)';
    ctx.fillRect(this.cx - 40, this.cy + y, 80, 1);
  }
};

Aether.Orb.prototype._drawEdgeGlow = function(ctx, c) {
  var a = 0.08 + Math.sin(this.frame * 0.03) * 0.03;
  ctx.strokeStyle = 'rgba(' + c.p + ',' + a + ')';
  ctx.lineWidth = 1;
  ctx.shadowColor = 'rgba(' + c.p + ',' + (a * 2) + ')';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, this.size * 0.435, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
};

Aether.Orb.prototype._drawPulseRing = function(ctx, c) {
  var r = this.size * (0.40 + this.reactivity * 0.05);
  var a = 0.15 + this.reactivity * 0.2;
  ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(' + c.p + ',' + (a * 0.6) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, r - 4, 0, Math.PI * 2); ctx.stroke();
};

Aether.Orb.prototype._drawThinkingRing = function(ctx, c) {
  var a = this.frame * 0.04;
  ctx.strokeStyle = 'rgba(' + c.p + ',0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(this.cx, this.cy, this.size * 0.42, a, a + Math.PI * 1.3); ctx.stroke();
};

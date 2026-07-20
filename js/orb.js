// Aether — orb.js → Photorealistic AI Face + Canvas Overlay
// Background: AI-generated face image. Overlay: animated eyes, mouth, glow effects.
// Landmarks from Gemini Vision analysis of the generated face.
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

  // Face image
  this.faceImg = null;
  this.faceLoaded = false;
  this._loadFace();

  // Face landmarks (percent of image, from Gemini Vision)
  // All values as fraction 0-1 of image dimensions
  this.lm = {
    leftEye:  { x: 0.366, y: 0.460 },
    rightEye: { x: 0.634, y: 0.460 },
    mouth:    { x: 0.500, y: 0.758 },
    mouthW:   0.22,
    faceC:    { x: 0.500, y: 0.515 },
    faceW:    0.64,
    nose:     { x: 0.500, y: 0.592 }
  };

  this._resize();
  this._startLoop();

  var self = this;
  window.addEventListener('resize', function() { self._resize(); });
};

// ── Load AI-generated face ───────────────────────

Aether.Orb.prototype._loadFace = function() {
  var self = this;
  this.faceImg = new Image();
  this.faceImg.onload = function() { self.faceLoaded = true; };
  this.faceImg.onerror = function() { /* keep drawing fallback */ };
  this.faceImg.src = 'assets/ai-face.png';
};

// ── Canvas Sizing ────────────────────────────────

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
  (function animate() {
    self.frame++;
    self._update();
    self._draw();
    self.animId = requestAnimationFrame(animate);
  })();
};

Aether.Orb.prototype._update = function() {
  this.reactivity += (this.targetReactivity - this.reactivity) * 0.12;

  // Mouth animation
  if (this.state === 'speaking') {
    this.mouthTarget = 0.3 + Math.sin(this.frame * 0.22) * 0.18 + Math.abs(Math.sin(this.frame * 0.13)) * 0.5;
  } else if (this.state === 'idle') {
    this.mouthTarget = Math.sin(this.frame * 0.015) * 0.02;
  } else {
    this.mouthTarget = 0;
  }
  this.mouthOpen += (this.mouthTarget - this.mouthOpen) * 0.25;

  // Eye tracking
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
};

// ── Public API ───────────────────────────────────

Aether.Orb.prototype.setState = function(state) {
  if (this.state === state) return;
  this.state = state;
  switch (state) {
    case 'idle':      this.targetReactivity = 0; break;
    case 'listening': this.targetReactivity = 0.5; break;
    case 'thinking':  this.targetReactivity = 0; break;
    case 'speaking':  this.targetReactivity = 0.3; break;
    case 'error':     this.targetReactivity = 0; break;
  }
};

Aether.Orb.prototype.pulse = function(intensity) {
  if (this.state === 'listening') this.targetReactivity = Math.min(1, 0.3 + intensity * 0.7);
  if (this.state === 'thinking') this.targetReactivity = Math.min(1, intensity * 0.5);
};

// ── Main Draw ────────────────────────────────────

Aether.Orb.prototype._draw = function() {
  var ctx = this.ctx;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.save(); ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, this.size, this.size);

  // Draw background image (face)
  if (this.faceLoaded && this.faceImg) {
    // Center the face, scale to fill the orb zone
    var faceW = this.size * 0.9;
    var faceH = this.size * 0.9;
    var fx = (this.size - faceW) / 2;
    var fy = (this.size - faceH) / 2;

    // Circular clip for the face
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.size * 0.44, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(this.faceImg, fx, fy, faceW, faceH);
    ctx.restore();
  }

  var c = this._colors();

  // Calculate face mapping: convert landmark % → canvas pixel
  var lm = this.lm;
  var fs = this.size;
  var imgW = fs * 0.9;
  var imgH = fs * 0.9;
  var imgX = (fs - imgW) / 2;
  var imgY = (fs - imgH) / 2;

  function lmToCanvas(lmx, lmy) {
    return {
      x: imgX + lmx * imgW,
      y: imgY + lmy * imgH
    };
  }

  var le = lmToCanvas(lm.leftEye.x, lm.leftEye.y);
  var re = lmToCanvas(lm.rightEye.x, lm.rightEye.y);
  var mo = lmToCanvas(lm.mouth.x, lm.mouth.y);
  var mouthWpx = lm.mouthW * imgW;

  // State-specific effects
  switch (this.state) {
    case 'idle':
      this._drawBgGlow(ctx, c, 0.08);
      this._drawEyeHighlights(ctx, le, re, c, 0.4);
      this._drawMouthOverlay(ctx, mo, mouthWpx, c);
      break;
    case 'listening':
      this._drawBgGlow(ctx, c, 0.12 + this.reactivity * 0.15);
      this._drawEyeHighlights(ctx, le, re, c, 0.7 + this.reactivity * 0.3);
      this._drawMouthOverlay(ctx, mo, mouthWpx, c);
      this._drawPulseRing(ctx, c, this.reactivity);
      break;
    case 'thinking':
      this._drawBgGlow(ctx, c, 0.1);
      this._drawEyeHighlights(ctx, le, re, c, 0.5);
      this._drawMouthOverlay(ctx, mo, mouthWpx, c);
      this._drawThinkingRing(ctx, c);
      break;
    case 'speaking':
      this._drawBgGlow(ctx, c, 0.1);
      this._drawEyeHighlights(ctx, le, re, c, 0.45);
      this._drawMouthOverlay(ctx, mo, mouthWpx, c);
      break;
    case 'error':
      this._drawBgGlow(ctx, c, 0.06);
      this._drawEyeHighlights(ctx, le, re, c, 0.5);
      this._drawMouthOverlay(ctx, mo, mouthWpx, c);
      break;
  }

  ctx.restore();
};

// ── Colors ───────────────────────────────────────

Aether.Orb.prototype._colors = function() {
  var r = this.reactivity;
  switch (this.state) {
    case 'idle':      return { p: '0,240,255', a:0.9, s:'0,170,210', sa:0.5 };
    case 'listening': return { p: '180,255,255', a:0.95, s:'120,230,255', sa:0.6 };
    case 'thinking':  return { p: '255,80,255', a:0.85, s:'200,60,220', sa:0.5 };
    case 'speaking':  return { p: '0,240,255', a:0.9, s:'0,180,220', sa:0.5 };
    case 'error':     return { p: '255,68,102', a:0.85, s:'200,50,70', sa:0.45 };
    default:          return { p: '0,240,255', a:0.9, s:'0,170,210', sa:0.5 };
  }
};

// ── Background Glow ──────────────────────────────

Aether.Orb.prototype._drawBgGlow = function(ctx, c, alpha) {
  var r = this.size * 0.44;
  var grad = ctx.createRadialGradient(this.cx, this.cy, r * 0.5, this.cx, this.cy, r);
  grad.addColorStop(0, 'rgba(' + c.p + ',0)');
  grad.addColorStop(0.7, 'rgba(' + c.p + ',' + alpha + ')');
  grad.addColorStop(1, 'rgba(' + c.p + ',0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
  ctx.fill();
};

// ── Eye Highlights ───────────────────────────────

Aether.Orb.prototype._drawEyeHighlights = function(ctx, le, re, c, alpha) {
  var ew = 14; // eye highlight width in px
  var eh = this.blinking > 0.4 ? 1 : 5;

  if (this.state === 'listening') eh *= 1.3;
  if (this.state === 'thinking') eh *= 0.5;

  // Iris glow
  [le, re].forEach(function(ep) {
    var ir = 5;
    var g = ctx.createRadialGradient(ep.x + this.eyeLookX * 4, ep.y + this.eyeLookY * 3, 0, ep.x, ep.y, ir);
    g.addColorStop(0, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.4, 'rgba(' + c.p + ',' + alpha + ')');
    g.addColorStop(1, 'rgba(' + c.p + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ep.x, ep.y, ir * 1.4, 0, Math.PI * 2); ctx.fill();
  }.bind(this));

  // Eyelid accent lines
  [le, re].forEach(function(ep) {
    ctx.strokeStyle = 'rgba(' + c.p + ',' + (alpha * 0.7) + ')';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(ep.x, ep.y - 1, ew, eh, 0, Math.PI, 0);
    ctx.stroke();
  }.bind(this));
};

// ── Mouth Overlay ────────────────────────────────

Aether.Orb.prototype._drawMouthOverlay = function(ctx, mo, mw, c) {
  var open = Math.max(0, this.mouthOpen);
  var glowAlpha = c.sa;

  if (open < 0.02) {
    // Subtle lip line highlight
    ctx.strokeStyle = 'rgba(' + c.p + ',0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(mo.x - mw * 0.5, mo.y - 0.5);
    ctx.quadraticCurveTo(mo.x, mo.y - 2.5, mo.x + mw * 0.5, mo.y - 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mo.x - mw * 0.5, mo.y + 0.5);
    ctx.quadraticCurveTo(mo.x, mo.y + 2, mo.x + mw * 0.5, mo.y + 0.5);
    ctx.stroke();
  } else {
    // Open mouth overlay
    var mh = open * 14;
    var mww = mw * 0.5 * (1 + open * 0.3);

    // Inner glow
    var ig = ctx.createRadialGradient(mo.x, mo.y, 0, mo.x, mo.y + mh * 0.3, mh);
    ig.addColorStop(0, 'rgba(' + c.p + ',0.3)');
    ig.addColorStop(0.6, 'rgba(' + c.p + ',0.1)');
    ig.addColorStop(1, 'transparent');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(mo.x, mo.y + 1, mww, mh, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mouth rim light
    ctx.strokeStyle = 'rgba(' + c.p + ',0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(mo.x, mo.y + 1, mww, mh, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
};

// ── Pulse Ring (listening) ───────────────────────

Aether.Orb.prototype._drawPulseRing = function(ctx, c, intensity) {
  var r = this.size * (0.40 + intensity * 0.08);
  var alpha = 0.15 + intensity * 0.2;
  ctx.strokeStyle = 'rgba(255,255,255,' + alpha + ')';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner pulse
  ctx.strokeStyle = 'rgba(' + c.p + ',' + (alpha * 0.7) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, r - 4, 0, Math.PI * 2);
  ctx.stroke();
};

// ── Thinking Ring (rotating arc) ─────────────────

Aether.Orb.prototype._drawThinkingRing = function(ctx, c) {
  var r = this.size * 0.42;
  var angle = this.frame * 0.04;
  ctx.strokeStyle = 'rgba(' + c.p + ',0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(this.cx, this.cy, r, angle, angle + Math.PI * 1.3);
  ctx.stroke();
};

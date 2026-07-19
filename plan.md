# Aether — Implementation Plan

> 🎙️ Jarvis-style Voice AI Assistant — พูดคุยกับ AI ด้วยเสียง

- **Path**: `C:\Users\Admin\Documents\GitHub\aether-voice`
- **Stack**: Pure HTML/CSS/JS (static, zero dependencies)
- **APIs**: Web Speech API (STT + TTS), DeepSeek Chat API (LLM)
- **Deploy**: GitHub Pages (HTTPS required for mic)
- **Repo**: https://github.com/ShamenKenjin/aether-voice
- **Live**: https://shamenkenjin.github.io/aether-voice/
- **Started**: 2026-07-19
- **Status**: ✅ Complete (Phase 1-5)

---

## ✅ Completed

- [x] BSF Phase 1 — Blueprint.html + companions/ (requirements.yaml, schema.prisma)
- [x] Project directory structure created
- [x] plan.md created

---

## 📋 Remaining

### Phase 2 — Core Modules ✅
- [x] `js/config.js` — Settings, i18n (TH/EN), 3 themes, API config, CSS variable injection
- [x] `js/speech.js` — Speech Recognition (STT) + Speech Synthesis (TTS) wrappers
- [x] `js/llm.js` — DeepSeek API client (streaming SSE + non-streaming)
- [x] `js/conversation.js` — Message history, localStorage persistence, export

### Phase 3 — Futuristic UI ✅
- [x] `css/style.css` — Dark theme, neon glow, glassmorphism, grid background (11.7KB)
- [x] `js/orb.js` — Canvas animated AI orb, 5 states, particles, rings, glow effects (10.1KB)
- [x] `js/ui.js` — Chat bubbles, mic button, settings panel, export dialog, i18n (13.8KB)
- [x] `index.html` — App shell with orb zone, chat area, control bar (6.4KB)

### Phase 4 — Integration & Polish ✅
- [x] `js/app.js` — Main app orchestration (wires speech → LLM → speech pipeline, 7.2KB)
- [x] Continuous conversation mode (auto-restart listening after TTS)
- [x] Voice selection for TTS (settings panel)
- [x] Settings panel (lang, voice, API key, system prompt, theme)
- [x] Error handling (no mic, bad API key, network fail, error toasts)
- [x] Mobile responsive layout (touch events, flexible sizing)
- [x] Conversation export (text + copy to clipboard)

### Phase 5 — Deploy ✅
- [x] Git init + commit (8917f21)
- [x] Create GitHub repo (`ShamenKenjin/aether-voice`)
- [x] Push to GitHub (master)
- [x] Enable GitHub Pages → https://shamenkenjin.github.io/aether-voice/

---

## Live

🔮 **https://shamenkenjin.github.io/aether-voice/**

---

## Blueprint Files

- `1-SRS/Blueprint.html` — Full BSF Phase 1 blueprint (TH/EN bilingual)
- `1-SRS/companions/requirements.yaml` — Structured requirements
- `1-SRS/companions/schema.prisma` — JS data structure definitions

## Key Commands

```bash
# Dev: open index.html directly in browser
# Note: STT requires HTTPS — use Chrome with --unsafely-treat-insecure-origin-as-secure
chrome --unsafely-treat-insecure-origin-as-secure="http://localhost:8080"

# Or serve via HTTPS for full mic access
npx http-server -S -C cert.pem -p 8080
```

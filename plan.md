# Aether — Implementation Plan

> 🎙️ Jarvis-style Voice AI Assistant — พูดคุยกับ AI ด้วยเสียง

- **Path**: `C:\Users\Admin\Documents\GitHub\aether-voice`
- **Stack**: Pure HTML/CSS/JS (static, zero dependencies)
- **APIs**: Web Speech API (STT), DeepSeek Chat API (LLM), Google TTS (via proxy)
- **TTS Proxy**: Pipeline-Studio server `:4001` (`POST /api/tts`)
- **Deploy**: GitHub Pages
- **Repo**: https://github.com/ShamenKenjin/aether-voice
- **Live**: https://shamenkenjin.github.io/aether-voice/
- **Started**: 2026-07-19
- **Last commit**: 698a7fc

---

## ✅ Completed

- [x] **Phase 1** — BSF Blueprint (TH/EN, 7 Mermaid diagrams)
- [x] **Phase 2** — Core: config, speech (STT/TTS), LLM (DeepSeek streaming), conversation
- [x] **Phase 3** — Futuristic UI: orb, chat bubbles, glassmorphism, 3 themes, responsive
- [x] **Phase 4** — Integration: speech→LLM→speech pipeline, settings, error handling
- [x] **Phase 5** — Deploy: GitHub repo + Pages
- [x] **TTS overhaul** — Google Translate TTS proxy, sentence splitting, auto-fallback to browser
- [x] **Text input** — พิมพ์แชท + Enter/send button
- [x] **File attachment** — แนบไฟล์ (.txt .md .json .py ฯลฯ) ให้ AI อ่านเป็น reference
- [x] **Bug fixes** — renderMessages null pointer, TTS fallback

---

## 📋 Remaining

### Phase 6 — Vision & Rich Media
- [ ] Image attachment → Gemini Vision API (describe image, feed to LLM)
- [ ] PDF text extraction (pdf.js or server-side)
- [ ] Markdown rendering in chat bubbles (code blocks, lists, bold)
- [ ] Copy message button per bubble

### Phase 7 — UX Polish
- [ ] Wake word detection ("Hey Aether") — always-listening mode
- [ ] Conversation history sidebar (load/delete past conversations)
- [ ] PWA — service worker for offline mode, installable icon
- [ ] Keyboard shortcuts (Ctrl+Enter to send, Ctrl+M for mic)
- [ ] Sound effects (send whoosh, receive chime)
- [ ] Typing indicator dots during LLM streaming

### Phase 8 — Backend/Advanced
- [ ] Public TTS proxy (deploy to free hosting — Render/Fly.io)
- [ ] Multi-model support (Gemini, OpenAI toggle in settings)
- [ ] Conversation branching (edit user message → re-generate)
- [ ] Token usage counter + cost tracking
- [ ] User authentication (optional — save conversations to cloud)

---

## Project Structure

```
aether-voice/
├── index.html              App shell
├── plan.md                 This file
├── 1-SRS/                  BSF Blueprint
│   ├── Blueprint.html
│   └── companions/
├── css/style.css           Futuristic theme
├── js/
│   ├── config.js           Settings, i18n, 3 themes
│   ├── speech.js           STT + TTS (proxy + browser)
│   ├── llm.js              DeepSeek API (streaming)
│   ├── conversation.js     Message history + localStorage
│   ├── orb.js              Canvas animated AI orb
│   ├── ui.js               Chat bubbles, settings, input bar
│   └── app.js              Main orchestration
└── assets/
```

## Key Commands

```bash
# Dev: open directly (STT needs HTTPS — use Chrome flag)
chrome --unsafely-treat-insecure-origin-as-secure="http://localhost:8080"
npx http-server -p 8080

# TTS proxy (Pipeline-Studio, separate project)
cd ../Pipeline-Studio/app && GCP_PROJECT_ID=pipeline-studio-502823 node server.js

# Deploy
git push origin master  # auto-deploys via GitHub Pages
```

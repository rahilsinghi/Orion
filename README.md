# Orion – Dark Sci-Fi AI Text Adventure

Orion is a web-first, chat-driven interactive fiction powered by OpenAI GPT-4o function calling.  Players decrypt ciphers, analyse images, and hack their way through a dystopian world dominated by an all-seeing AI.

---

## Quick start

```bash
# clone
git clone https://github.com/rahilsinghi/Orion.git
cd Orion

# install deps
npm install

# add your OpenAI key
cp .env.example .env.local
# then edit .env.local and paste:
# OPENAI_API_KEY=sk-…

# run dev server
npm run dev
```
Visit <http://localhost:3000> and start playing.

---

## Project structure

```
src/
  app/            ← Next 14 App Router
    api/
      chat/        ← AI orchestrator (function-calling, game state)
      tools/       ← Simple tool endpoints (decode_caesar, analyze_image)
  components/      ← React UI (chat view)
  lib/             ← Helpers (OpenAI singleton)
  types/           ← Shared TS types
  utils/           ← Pure utilities (Caesar decoder, …)
public/            ← Static assets (images, SFX)
.github/workflows/ ← CI pipeline
```

---

## Available scripts

| Command            | Purpose                                |
|--------------------|----------------------------------------|
| `npm run dev`      | Next.js dev server with hot-reload.    |
| `npm run lint`     | ESLint + TypeScript checks.            |
| `npm run build`    | Production build (static + server).    |

---

## Environment variables

| Var               | Description                      |
|-------------------|----------------------------------|
| `OPENAI_API_KEY`  | Your OpenAI secret key (server)  |

► **Never** commit real keys – store them in GitHub Secrets or `.env.local` (which is git-ignored).

---

## CI / CD

A lightweight GitHub Actions workflow lint-checks and builds on every push.  See `.github/workflows/ci.yml`.

Deploy effortlessly to [Vercel](https://vercel.com/new) – the app is already Next 14-compatible.

---

## Roadmap

-  ✅ Act I vertical slice (cipher, locker code, image QR, auto-transition)
-  ⬜ Act II content & puzzles
-  ⬜ Adaptive hint system
-  ⬜ Soundscape & glitch effects
-  ⬜ Save / Load across devices (supabase)

PRs & issues welcome – let's push the limits of AI-driven games 🚀

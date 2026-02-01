# Devanshi Support Agent

A React app that lets users talk to your **ElevenLabs Conversational Agent** (Devanshi) via voice. Users click **"Talk now with Devanshi"** to start a real-time voice conversation.

Built with [Vite](https://vite.dev) + [React](https://react.dev) + [@elevenlabs/react](https://www.npmjs.com/package/@elevenlabs/react). Based on the [ElevenLabs UI Blocks - Agents](https://ui.elevenlabs.io/blocks/agents).

---

## Prerequisites

- **Node.js** 18+ 
- An **ElevenLabs account** and a **Conversational Agent** (configured in the [ElevenLabs dashboard](https://elevenlabs.io/app/agents))

---

## Quick Start

### 1. Install dependencies

```bash
cd devanshi-support-agent
npm install
```

### 2. Configure your Agent ID

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your ElevenLabs Agent ID:

```env
VITE_ELEVENLABS_AGENT_ID=agent_xxxxxxxxxxxx
```

Get your Agent ID from [ElevenLabs → Agents](https://elevenlabs.io/app/agents) → select your agent → copy the Agent ID.

### 3. Run locally

```bash
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`). Click **"Talk now with Devanshi"** and allow microphone access when prompted.

---

## Deployment

The app builds to static files (`dist/`), so you can deploy it to any static host.

### Option A: Vercel

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Import Project** → select your repo.
3. Set the **Root Directory** to `devanshi-support-agent` if the project is in a subfolder.
4. Add environment variable:
   - **Name:** `VITE_ELEVENLABS_AGENT_ID`
   - **Value:** your agent ID
5. Deploy. Vercel will run `npm run build` automatically.

### Option B: Netlify

1. Push your code to GitHub.
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**.
3. **Build command:** `npm run build`  
   **Publish directory:** `dist`
4. Add environment variable:
   - **Key:** `VITE_ELEVENLABS_AGENT_ID`  
   - **Value:** your agent ID
5. Deploy.

### Option C: GitHub Pages / Other static host

1. Build locally:
   ```bash
   npm run build
   ```
2. Upload the contents of the `dist/` folder to your host.
3. **Important:** For Vite apps, env vars are baked in at build time. Set `VITE_ELEVENLABS_AGENT_ID` before running `npm run build`, or configure it in your CI/CD pipeline.

---

## Project structure

```
devanshi-support-agent/
├── src/
│   ├── App.tsx           # Landing page + "Talk now with Devanshi" CTA
│   ├── App.css
│   ├── main.tsx
│   ├── index.css         # Global styles
│   └── components/
│       ├── VoiceAgent.tsx # ElevenLabs conversation + WebRTC
│       └── VoiceAgent.css
├── index.html
├── package.json
├── vite.config.ts
├── .env.example
└── README.md
```

---

## Reference

- [ElevenLabs UI Blocks - Agents](https://ui.elevenlabs.io/blocks/agents)
- [ElevenLabs React SDK docs](https://elevenlabs.io/docs/agents-platform/libraries/react)

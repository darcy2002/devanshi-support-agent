# Devanshi Dashboard (Phase 2)

React dashboard for Devanshi (agent owner). **Authenticated** — sign in with the credentials configured in the backend to view agent summary and call activity.

## Features

- **Login**: Username + password; JWT stored in `localStorage`.
- **Agent summary**: Name, last call time, created at (from ElevenLabs [Get Agent Summaries](https://elevenlabs.io/docs/agents-platform/api-reference/agents/get-summaries)).
- **Call activity**: Table of conversations — when, duration, message count, status, call summary/title (from ElevenLabs [List Conversations](https://elevenlabs.io/docs/conversational-ai/api-reference/conversations/list)).
- **Back to app**: Link to the main support agent app (configurable via `VITE_APP_URL`).

## Environment

Copy `.env.example` to `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_APP_URL` | No | URL of the main support agent app (e.g. `http://localhost:5173`) for the "Back to app" link. Default `/`. |

The dashboard uses Vite’s proxy: `/api` and `/auth` are proxied to the backend (default `http://localhost:3001`). Run the backend first.

## Run

```bash
npm install
npm run dev
```

Dashboard: `http://localhost:5174`. Log in with the same credentials as in `backend/.env` (`DASHBOARD_USER` / `DASHBOARD_PASSWORD`).

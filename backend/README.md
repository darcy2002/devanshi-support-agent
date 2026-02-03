# Devanshi Dashboard API (Phase 2)

Express backend for the Devanshi dashboard. **Authenticated only** — Devanshi logs in with username/password and receives a JWT; all API routes require the `Authorization: Bearer <token>` header.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Body: `{ username, password }`. Returns `{ token, user }`. |
| GET | `/api/agent-summary` | Yes | Returns agent summary from ElevenLabs [Get Agent Summaries](https://elevenlabs.io/docs/agents-platform/api-reference/agents/get-summaries). |
| GET | `/api/conversations` | Yes | Returns conversations from ElevenLabs [List Conversations](https://elevenlabs.io/docs/conversational-ai/api-reference/conversations/list). Query: `cursor`, `page_size`. |

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default `3001`). |
| `JWT_SECRET` | Yes | Secret for signing JWTs (use a long random string in production). |
| `DASHBOARD_USER` | Yes | Login username (e.g. `devanshi`). |
| `DASHBOARD_PASSWORD` | Yes | Login password. |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key (xi-api-key). From [ElevenLabs → API Keys](https://elevenlabs.io/app/settings/api-keys). |
| `AGENT_ID` | Yes | Your agent ID (same as `VITE_ELEVENLABS_AGENT_ID` in the main app). From [ElevenLabs → Agents](https://elevenlabs.io/app/agents). |

## Run

```bash
npm install
npm run dev   # with --watch
# or
npm start
```

API base URL: `http://localhost:3001`.

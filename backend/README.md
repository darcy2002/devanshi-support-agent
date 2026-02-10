# Devanshi Dashboard API (Phase 2)

Express backend for the Devanshi dashboard. **Authenticated only** — Devanshi logs in with username/password and receives a JWT; all API routes require the `Authorization: Bearer <token>` header.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Body: `{ username, password }`. Returns `{ token, user }`. |
| GET | `/api/agent-summary` | Yes | Returns agent summary from ElevenLabs [Get Agent Summaries](https://elevenlabs.io/docs/agents-platform/api-reference/agents/get-summaries). |
| GET | `/api/conversations` | Yes | Returns conversations from ElevenLabs [List Conversations](https://elevenlabs.io/docs/conversational-ai/api-reference/conversations/list). Query: `cursor`, `page_size`. |
| GET | `/api/conversations/:id` | Yes | Returns one conversation (transcript, metadata) from ElevenLabs. |
| POST | `/api/calendar/create-from-conversation` | Yes | Body: `{ conversationId }`. If the call shows intent to schedule a call with Devanshi, creates a Google Calendar event. Returns `{ created, event?, reason? }`. |

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
| `GOOGLE_CLIENT_ID` | For Calendar | OAuth 2.0 Client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). |
| `GOOGLE_CLIENT_SECRET` | For Calendar | OAuth 2.0 Client secret. |
| `GOOGLE_REFRESH_TOKEN` | For Calendar | Refresh token from a one-time OAuth flow (scope: `https://www.googleapis.com/auth/calendar`). |

### Google Calendar (optional)

When set, the dashboard can create events on your (Devanshi’s) calendar when a call transcript shows **intent to schedule a call with Devanshi** (e.g. “I’d like to book a call with you next Tuesday”).

1. [Enable the Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) and create **OAuth 2.0 Web application** credentials. Note your **Client ID** and **Client secret**.
2. In the same OAuth client, add **Authorized redirect URI**: `http://localhost:3232/oauth2callback`
3. In `backend/.env` set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (leave `GOOGLE_REFRESH_TOKEN` empty for now).
4. From the `backend` folder run:
   ```bash
   node scripts/get-google-refresh-token.js
   ```
   Your browser will open; sign in with the Google account that owns the calendar and allow access. The script will print a line like `GOOGLE_REFRESH_TOKEN=...`. Copy that into `.env`.
5. Optional: `GOOGLE_CALENDAR_ID` (default `primary`), `GOOGLE_CALENDAR_TIMEZONE` (e.g. `America/Los_Angeles`), `GOOGLE_CALENDAR_EVENT_TITLE`.

**If you get `401 unauthorized_client`:** The refresh token must be obtained with the **same** Client ID and Client secret that are in your `.env`. Do not use a token from OAuth Playground or another app. Use the script above with your own Web application credentials.

## Run

```bash
npm install
npm run dev   # with --watch
# or
npm start
```

API base URL: `http://localhost:3001`.

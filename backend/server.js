import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { createCalendarEvent, isCalendarConfigured } from './calendar.js';
import { detectScheduleCallIntent, getFullText } from './intent.js';
import { parseEventDateTime } from './parseDateTime.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'devanshi';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const elevenLabs = axios.create({
  baseURL: 'https://api.elevenlabs.io',
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
  },
});

// SSE clients: dashboards subscribed to agent-activity events
const sseClients = [];

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// SSE: dashboard subscribes here and gets "refresh" when support app reports activity
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  sseClients.push(res);
  res.on('close', () => {
    const i = sseClients.indexOf(res);
    if (i !== -1) sseClients.splice(i, 1);
  });
});

// Support app calls this when a user starts or ends a call; notifies dashboards to refresh
app.post('/api/agent-activity', (req, res) => {
  const payload = 'data: refresh\n\n';
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch (err) {
      // ignore write errors (e.g. closed connection)
    }
  });
  res.status(204).end();
});

app.post('/auth/login', (req, res) => {
  try {
    const { username, password } = req.body || {};
    const secret = JWT_SECRET && String(JWT_SECRET).trim() ? JWT_SECRET : 'dev-secret-change-in-production';
    if (username !== DASHBOARD_USER || password !== DASHBOARD_PASSWORD) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { sub: username, role: 'admin' },
      secret,
      { expiresIn: '7d' }
    );
    return res.json({ token, user: { username } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed. Check server logs.' });
  }
});

app.get('/api/agent-summary', authMiddleware, async (req, res) => {
  if (!ELEVENLABS_API_KEY || !AGENT_ID) {
    return res.status(503).json({ error: 'ElevenLabs API not configured (ELEVENLABS_API_KEY, AGENT_ID)' });
  }
  try {
    const { data } = await elevenLabs.get('/v1/convai/agents/summaries', {
      params: { agent_ids: [AGENT_ID] },
      paramsSerializer: (params) =>
        Object.entries(params)
          .flatMap(([k, v]) =>
            Array.isArray(v) ? v.map((val) => `${k}=${encodeURIComponent(val)}`) : [`${k}=${encodeURIComponent(v)}`]
          )
          .join('&'),
    });
    const raw = data?.[AGENT_ID] ?? (Array.isArray(data) ? data[0] : Object.values(data || {})[0]);
    const entry = raw?.data ?? raw;
    if (entry?.status === 'failure') {
      return res.status(502).json({ error: entry.error_message || 'Agent summary failed' });
    }
    return res.json(entry ?? {});
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.detail?.message || err.message || 'ElevenLabs request failed';
    return res.status(status).json({ error: message });
  }
});

app.get('/api/conversations', authMiddleware, async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'ElevenLabs API not configured' });
  }
  try {
    const { cursor, page_size = 30 } = req.query;
    const params = { page_size: Math.min(Number(page_size) || 30, 100), summary_mode: 'include' };
    if (AGENT_ID) params.agent_id = AGENT_ID;
    if (cursor) params.cursor = cursor;
    const { data } = await elevenLabs.get('/v1/convai/conversations', { params });
    return res.json(data || { conversations: [], has_more: false, next_cursor: null });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.detail?.message || err.message || 'ElevenLabs request failed';
    return res.status(status).json({ error: message });
  }
});

app.get('/api/conversations/:conversationId', authMiddleware, async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'ElevenLabs API not configured' });
  }
  const { conversationId } = req.params;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversation_id required' });
  }
  try {
    const { data } = await elevenLabs.get(`/v1/convai/conversations/${encodeURIComponent(conversationId)}`);
    return res.json(data || {});
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.detail?.message || err.message || 'ElevenLabs request failed';
    return res.status(status).json({ error: message });
  }
});

/**
 * Create a Google Calendar event when the conversation shows intent to schedule a call with Devanshi.
 * Only runs when intent is detected (schedule/book + Devanshi/you context). Uses call transcript/summary.
 * @see https://developers.google.com/workspace/calendar/api/guides/create-events
 */
app.post('/api/calendar/create-from-conversation', authMiddleware, async (req, res) => {
  if (!isCalendarConfigured()) {
    return res.status(503).json({ error: 'Google Calendar not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.' });
  }
  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'ElevenLabs API not configured' });
  }
  const { conversationId } = req.body || {};
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId required in body' });
  }
  try {
    const { data: conversation } = await elevenLabs.get(`/v1/convai/conversations/${encodeURIComponent(conversationId)}`);
    const { wantsScheduleCall, confidence } = detectScheduleCallIntent(conversation || {});

    if (!wantsScheduleCall || confidence !== 'high') {
      return res.json({
        created: false,
        reason: 'no_schedule_intent',
        message: 'Conversation did not show clear intent to schedule a call with Devanshi.',
        confidence,
      });
    }

    const fullText = getFullText(conversation || {});
    const { start, end, timeZone } = parseEventDateTime(fullText);
    const summary = process.env.GOOGLE_CALENDAR_EVENT_TITLE || 'Call with Devanshi';
    const description = [
      'Created from Support Agent conversation.',
      conversationId ? `Conversation ID: ${conversationId}` : '',
      (conversation?.transcript_summary || conversation?.call_summary_title || '').slice(0, 500),
    ]
      .filter(Boolean)
      .join('\n\n');

    const event = await createCalendarEvent({
      summary,
      description,
      start,
      end,
      timeZone,
    });

    return res.json({
      created: true,
      event: {
        id: event.id,
        htmlLink: event.htmlLink,
        summary: event.summary,
        start: event.start,
        end: event.end,
      },
      intent: 'schedule_call',
    });
  } catch (err) {
    console.error('Calendar create-from-conversation error:', err);
    const status = err.response?.status || err.code === 'ECONNREFUSED' ? 502 : 500;
    const message = err.message || err.response?.data?.error?.message || 'Failed to create calendar event';
    return res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard API running at http://localhost:${PORT}`);
});

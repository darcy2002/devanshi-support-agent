import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import axios from 'axios';

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

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username !== DASHBOARD_USER || password !== DASHBOARD_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign(
    { sub: username, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  return res.json({ token, user: { username } });
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
    const { data } = await elevenLabs.get('/v1/convai/conversations', {
      params,
      paramsSerializer: { indexes: null },
    });
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

app.listen(PORT, () => {
  console.log(`Dashboard API running at http://localhost:${PORT}`);
});

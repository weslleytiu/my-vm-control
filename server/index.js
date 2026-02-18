import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const RUNPOD_BASE = 'https://rest.runpod.io/v1';
const PORT = Number(process.env.PORT) || 3000;

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

app.use(express.json());

function getRunPodKey(req, res, next) {
  const key = process.env.RUNPOD_API_KEY?.trim();
  if (!key) {
    res.status(503).json({
      error: 'RUNPOD_API_KEY is not set. Add it to the server .env file and restart.',
      code: 'API_KEY_NOT_CONFIGURED',
    });
    return;
  }
  req.runpodKey = key;
  next();
}

async function proxyToRunPod(path, options = {}) {
  const url = `${RUNPOD_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${options.apiKey}`,
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

app.get('/api/pods', getRunPodKey, async (req, res) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    const path = query ? `/pods?${query}` : '/pods';
    const { status, body } = await proxyToRunPod(path, { apiKey: req.runpodKey });
    res.status(status).json(body);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Proxy request failed', message: err.message });
  }
});

app.get('/api/pods/:id', getRunPodKey, async (req, res) => {
  try {
    const { id } = req.params;
    const path = `/pods/${encodeURIComponent(id)}?includeMachine=true`;
    const { status, body } = await proxyToRunPod(path, { apiKey: req.runpodKey });
    res.status(status).json(body);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Proxy request failed', message: err.message });
  }
});

app.post('/api/pods/:id/start', getRunPodKey, async (req, res) => {
  try {
    const { id } = req.params;
    const path = `/pods/${encodeURIComponent(id)}/start`;
    const { status, body } = await proxyToRunPod(path, {
      apiKey: req.runpodKey,
      method: 'POST',
    });
    res.status(status).json(body ?? {});
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Proxy request failed', message: err.message });
  }
});

app.post('/api/pods/:id/stop', getRunPodKey, async (req, res) => {
  try {
    const { id } = req.params;
    const path = `/pods/${encodeURIComponent(id)}/stop`;
    const { status, body } = await proxyToRunPod(path, {
      apiKey: req.runpodKey,
      method: 'POST',
    });
    res.status(status).json(body ?? {});
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Proxy request failed', message: err.message });
  }
});

app.post('/api/pods/:id/restart', getRunPodKey, async (req, res) => {
  try {
    const { id } = req.params;
    const path = `/pods/${encodeURIComponent(id)}/restart`;
    const { status, body } = await proxyToRunPod(path, {
      apiKey: req.runpodKey,
      method: 'POST',
    });
    res.status(status).json(body ?? {});
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Proxy request failed', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`RunPod proxy running at http://localhost:${PORT}`);
  if (!process.env.RUNPOD_API_KEY?.trim()) {
    console.warn('Warning: RUNPOD_API_KEY is not set. Set it in .env and restart.');
  }
});

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Client } from 'ssh2';
import { getApiKey, notConfiguredResponse, proxyToRunPod } from '../lib/runpod-proxy.js';

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

async function proxyToRunPodExpress(path, options = {}) {
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

async function getPodSshDetails(podId, apiKey) {
  const { status, body } = await proxyToRunPodExpress(`/pods/${encodeURIComponent(podId)}?includeMachine=true`, { apiKey });
  if (status !== 200 || !body) {
    return null;
  }
  
  const ip = body.publicIp?.trim();
  const port = body.portMappings?.['22'];
  
  if (!ip || !port) {
    return null;
  }
  
  return { ip, port: parseInt(port, 10) };
}

async function executeSshCommand(ip, port, command, privateKeyPath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = '';
    let errorOutput = '';
    
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        
        stream.on('close', (code, signal) => {
          conn.end();
          if (code !== 0 && !output) {
            reject(new Error(`Command failed with code ${code}: ${errorOutput || output}`));
          } else {
            resolve(output || 'Command executed successfully');
          }
        }).on('data', (data) => {
          output += data.toString();
        }).stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      });
    }).on('error', (err) => {
      reject(new Error(`SSH connection failed: ${err.message}`));
    }).connect({
      host: ip,
      port: port,
      username: 'root',
      privateKey: require('fs').readFileSync(privateKeyPath),
      readyTimeout: 20000,
      keepaliveInterval: 5000,
    });
  });
}

// Pod routes
app.get('/api/pods', getRunPodKey, async (req, res) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    const path = query ? `/pods?${query}` : '/pods';
    const { status, body } = await proxyToRunPodExpress(path, { apiKey: req.runpodKey });
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
    const { status, body } = await proxyToRunPodExpress(path, { apiKey: req.runpodKey });
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
    const { status, body } = await proxyToRunPodExpress(path, {
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
    const { status, body } = await proxyToRunPodExpress(path, {
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
    const { status, body } = await proxyToRunPodExpress(path, {
      apiKey: req.runpodKey,
      method: 'POST',
    });
    res.status(status).json(body ?? {});
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Proxy request failed', message: err.message });
  }
});

// Gateway routes
const GATEWAY_URL = 'https://oyxpvo2t8uxuuk-18789.proxy.runpod.net';
const GATEWAY_TOKEN = 'dcb99a5cbec2dfd354b3303e6bd8e986bb1395f4e6cbeb2d';

app.get('/api/gateway-health', async (req, res) => {
  try {
    const response = await fetch(`${GATEWAY_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`
      }
    });

    res.status(200).json({
      status: response.ok ? 'online' : 'error',
      statusCode: response.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(200).json({
      status: 'offline',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/gateway-restart', getRunPodKey, async (req, res) => {
  const gatewayPodId = process.env.GATEWAY_POD_ID || 'oyxpvo2t8uxuuk';
  const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH || '/root/.ssh/id_ed25519';
  
  try {
    const sshDetails = await getPodSshDetails(gatewayPodId, req.runpodKey);
    
    if (!sshDetails) {
      return res.status(503).json({
        error: 'Cannot connect to Gateway pod',
        details: 'Pod is not running or SSH is not available'
      });
    }
    
    const result = await executeSshCommand(
      sshDetails.ip,
      sshDetails.port,
      'openclaw gateway restart',
      privateKeyPath
    );
    
    res.status(200).json({
      success: true,
      message: 'Gateway restart initiated',
      output: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Gateway Restart Error]', error);
    res.status(500).json({
      error: 'Failed to restart gateway',
      details: error.message
    });
  }
});

app.get('/api/gateway-logs', getRunPodKey, async (req, res) => {
  const lines = parseInt(req.query.lines || '100', 10);
  const gatewayPodId = process.env.GATEWAY_POD_ID || 'oyxpvo2t8uxuuk';
  const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH || '/root/.ssh/id_ed25519';
  
  try {
    const sshDetails = await getPodSshDetails(gatewayPodId, req.runpodKey);
    
    if (!sshDetails) {
      return res.status(503).json({
        error: 'Cannot connect to Gateway pod',
        details: 'Pod is not running or SSH is not available'
      });
    }
    
    const commands = [
      `journalctl -u openclaw -n ${lines} --no-pager 2>/dev/null || true`,
      `tail -n ${lines} /var/log/openclaw.log 2>/dev/null || true`,
      `pm2 logs openclaw --lines ${lines} --nostream 2>/dev/null || true`,
      `docker logs openclaw --tail ${lines} 2>/dev/null || true`,
    ];
    
    let logs = '';
    for (const cmd of commands) {
      try {
        const result = await executeSshCommand(sshDetails.ip, sshDetails.port, cmd, privateKeyPath);
        if (result && result.trim() && result !== 'No logs available') {
          logs = result;
          break;
        }
      } catch (e) {
        // Continua tentando os outros comandos
      }
    }
    
    if (!logs) {
      logs = 'No logs found. The Gateway may not be running or logs are not available.';
    }
    
    res.status(200).json({
      logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Gateway Logs Error]', error);
    res.status(500).json({
      error: 'Failed to fetch logs',
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`RunPod proxy running at http://localhost:${PORT}`);
  if (!process.env.RUNPOD_API_KEY?.trim()) {
    console.warn('Warning: RUNPOD_API_KEY is not set. Set it in .env and restart.');
  }
});

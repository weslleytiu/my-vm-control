import { Client } from 'ssh2';
import { getApiKey, notConfiguredResponse, proxyToRunPod } from '../../../lib/runpod-proxy.js';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...headers },
  });
}

function getIdFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return segments[2] || null;
}

/** Normalize private key from env: restore newlines if stored as literal \\n */
function normalizePrivateKey(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  return raw.trim().replace(/\\n/g, '\n');
}

async function getPodSshDetails(podId, apiKey) {
  const { status, body } = await proxyToRunPod(`/pods/${encodeURIComponent(podId)}?includeMachine=true`, { apiKey });
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

async function executeSshCommand(ip, port, command, privateKeyContent) {
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
          if (code !== 0) {
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
      privateKey: privateKeyContent,
      readyTimeout: 20000,
      keepaliveInterval: 5000,
    });
  });
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      const { status, body } = notConfiguredResponse();
      return jsonResponse(body, status);
    }

    let privateKeyContent = normalizePrivateKey(process.env.SSH_PRIVATE_KEY);
    if (!privateKeyContent) {
      return jsonResponse({
        error: 'SSH not configured',
        details: 'SSH_PRIVATE_KEY is not set. Set it in Vercel Environment Variables.',
        code: 'SSH_KEY_NOT_CONFIGURED',
      }, 503);
    }

    const pathname = new URL(request.url).pathname;
    const id = getIdFromPath(pathname);
    if (!id) {
      return jsonResponse({ error: 'Missing pod id' }, 400);
    }

    let command = 'source /workspace/env.sh';
    try {
      const body = await request.json().catch(() => ({}));
      if (body && typeof body.command === 'string' && body.command.trim()) {
        command = body.command.trim();
      }
    } catch {
      // keep default command
    }

    try {
      const sshDetails = await getPodSshDetails(id, apiKey);
      if (!sshDetails) {
        return jsonResponse({
          error: 'Pod unreachable',
          details: 'Pod is not running or SSH (port 22) is not available',
        }, 503);
      }

      const output = await executeSshCommand(
        sshDetails.ip,
        sshDetails.port,
        command,
        privateKeyContent
      );

      return jsonResponse({
        success: true,
        output,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Pod Exec Error]', error);
      return jsonResponse({
        error: 'Failed to run command on pod',
        details: error.message,
      }, 500);
    }
  },
};

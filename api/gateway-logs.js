import { Client } from 'ssh2';
import { getApiKey, notConfiguredResponse, proxyToRunPod } from '../lib/runpod-proxy.js';
import { buildGatewayErrorPayload } from '../lib/gateway-errors.js';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...headers },
  });
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

function normalizePrivateKey(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  return raw.trim().replace(/\\n/g, '\n');
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
          if (code !== 0 && !output) {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          } else {
            resolve(output || 'No logs available');
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

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        const { status, body } = notConfiguredResponse();
        return jsonResponse(body, status);
      }

      const url = new URL(request.url);
      const lines = parseInt(url.searchParams.get('lines') || '100', 10);
      const gatewayPodId = process.env.GATEWAY_POD_ID || 'oyxpvo2t8uxuuk';
      const privateKeyContent = normalizePrivateKey(process.env.SSH_PRIVATE_KEY);
      if (!privateKeyContent) {
        return jsonResponse({
          error: 'SSH not configured',
          details: 'SSH_PRIVATE_KEY is not set. Set it in Vercel Environment Variables.',
          code: 'SSH_KEY_NOT_CONFIGURED',
        }, 503);
      }

      const sshDetails = await getPodSshDetails(gatewayPodId, apiKey);

      if (!sshDetails) {
        return jsonResponse({
          error: 'Cannot connect to Gateway pod',
          details: 'Pod is not running or SSH is not available.',
          code: 'POD_UNAVAILABLE',
        }, 503);
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
          const result = await executeSshCommand(sshDetails.ip, sshDetails.port, cmd, privateKeyContent);
          if (result && result.trim() && result !== 'No logs available') {
            logs = result;
            break;
          }
        } catch {
          // Try next command
        }
      }

      if (!logs) {
        logs = 'No logs found. The Gateway may not be running or logs are not available.';
      }

      return jsonResponse({
        logs,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Gateway Logs Error]', err);
      return jsonResponse(buildGatewayErrorPayload(err, 'logs'), 500);
    }
  },
};

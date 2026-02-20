import { Client } from 'ssh2';
import { getApiKey, notConfiguredResponse, proxyToRunPod } from '../lib/runpod-proxy.js';

const GATEWAY_URL = 'https://oyxpvo2t8uxuuk-18789.proxy.runpod.net';
const GATEWAY_TOKEN = 'dcb99a5cbec2dfd354b3303e6bd8e986bb1395f4e6cbeb2d';

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
  async fetch(request, env) {
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

    const gatewayPodId = process.env.GATEWAY_POD_ID || 'oyxpvo2t8uxuuk';
    const privateKeyContent = normalizePrivateKey(process.env.SSH_PRIVATE_KEY);
    if (!privateKeyContent) {
      return jsonResponse({
        error: 'SSH not configured',
        details: 'SSH_PRIVATE_KEY is not set. Set it in Vercel Environment Variables.',
        code: 'SSH_KEY_NOT_CONFIGURED',
      }, 503);
    }
    
    try {
      const sshDetails = await getPodSshDetails(gatewayPodId, apiKey);
      
      if (!sshDetails) {
        return jsonResponse({
          error: 'Cannot connect to Gateway pod',
          details: 'Pod is not running or SSH is not available'
        }, 503);
      }
      
      const result = await executeSshCommand(
        sshDetails.ip,
        sshDetails.port,
        'export PATH="/workspace/.npm-global/bin:/usr/local/bin:$PATH"; openclaw gateway restart',
        privateKeyContent
      );
      
      return jsonResponse({
        success: true,
        message: 'Gateway restart initiated',
        output: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Gateway Restart Error]', error);
      return jsonResponse({
        error: 'Failed to restart gateway',
        details: error.message
      }, 500);
    }
  },
};

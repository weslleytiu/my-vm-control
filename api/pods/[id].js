import { getApiKey, notConfiguredResponse, proxyToRunPod } from '../../lib/runpod-proxy.js';

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

function getIdFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return segments[2] || null;
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    const key = getApiKey();
    if (!key) {
      const { status, body } = notConfiguredResponse();
      return jsonResponse(body, status);
    }
    const pathname = new URL(request.url).pathname;
    const id = getIdFromPath(pathname);
    if (!id) {
      return jsonResponse({ error: 'Missing pod id' }, 400);
    }
    try {
      const path = `/pods/${encodeURIComponent(id)}?includeMachine=true`;
      const { status, body } = await proxyToRunPod(path, { apiKey: key });
      return jsonResponse(body, status);
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: 'Proxy request failed', message: err.message }, 502);
    }
  },
};

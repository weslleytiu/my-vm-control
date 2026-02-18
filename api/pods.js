import { getApiKey, notConfiguredResponse, proxyToRunPod } from '../lib/runpod-proxy.js';

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

export default {
  async fetch(request) {
    console.log('[Bob Control VM api/pods]', request.method, request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }
    const key = getApiKey();
    console.log('[Bob Control VM api/pods] RUNPOD_API_KEY set:', !!key);
    if (!key) {
      const { status, body } = notConfiguredResponse();
      console.log('[Bob Control VM api/pods] returning', status, body?.code);
      return jsonResponse(body, status);
    }
    try {
      const url = new URL(request.url);
      const query = url.searchParams.toString();
      const path = query ? `/pods?${query}` : '/pods';
      const { status, body } = await proxyToRunPod(path, { apiKey: key });
      const count = Array.isArray(body) ? body.length : 'n/a';
      console.log('[Bob Control VM api/pods] RunPod response status', status, 'pods count', count);
      return jsonResponse(body, status);
    } catch (err) {
      console.error('[Bob Control VM api/pods] proxy error', err);
      return jsonResponse({ error: 'Proxy request failed', message: err.message }, 502);
    }
  },
};

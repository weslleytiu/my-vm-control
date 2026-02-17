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
    try {
      const url = new URL(request.url);
      const query = url.searchParams.toString();
      const path = query ? `/pods?${query}` : '/pods';
      const { status, body } = await proxyToRunPod(path, { apiKey: key });
      return jsonResponse(body, status);
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: 'Proxy request failed', message: err.message }, 502);
    }
  },
};

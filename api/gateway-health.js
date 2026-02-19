import { getApiKey, notConfiguredResponse } from '../lib/runpod-proxy.js';

const GATEWAY_URL = 'https://oyxpvo2t8uxuuk-18789.proxy.runpod.net';
const GATEWAY_TOKEN = 'dcb99a5cbec2dfd354b3303e6bd8e986bb1395f4e6cbeb2d';

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

    const apiKey = getApiKey();
    if (!apiKey) {
      const { status, body } = notConfiguredResponse();
      return jsonResponse(body, status);
    }

    try {
      const response = await fetch(`${GATEWAY_URL}/health`, {
        headers: {
          'Authorization': `Bearer ${GATEWAY_TOKEN}`
        }
      });

      return jsonResponse({
        status: response.ok ? 'online' : 'error',
        statusCode: response.status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return jsonResponse({
        status: 'offline',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },
};

const RUNPOD_BASE = 'https://rest.runpod.io/v1';

export function getApiKey() {
  const key = process.env.RUNPOD_API_KEY?.trim();
  return key || null;
}

export function notConfiguredResponse() {
  return {
    status: 503,
    body: {
      error: 'RUNPOD_API_KEY is not set. Set it in Vercel Environment Variables (or .env for local).',
      code: 'API_KEY_NOT_CONFIGURED',
    },
  };
}

export async function proxyToRunPod(path, options = {}) {
  const url = `${RUNPOD_BASE}${path}`;
  console.log('[Bob Control VM proxy]', options.method || 'GET', path);
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
  console.log('[Bob Control VM proxy] RunPod status', res.status, 'body type', Array.isArray(body) ? `array(${body.length})` : typeof body);
  return { status: res.status, body };
}

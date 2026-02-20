/**
 * Builds a clear, consistent error payload for gateway API routes.
 * @param {Error|unknown} err - Caught error
 * @param {'start'|'restart'|'logs'} context - Which action failed
 * @returns {{ error: string, details: string, code: string, hint?: string }}
 */
export function buildGatewayErrorPayload(err, context) {
  const message = err?.message ?? String(err);
  const name = err?.name ?? 'Error';
  const titles = {
    start: 'Failed to start gateway',
    restart: 'Failed to restart gateway',
    logs: 'Failed to fetch gateway logs',
  };
  const hint = resolveHint(message);
  return {
    error: titles[context] ?? 'Gateway action failed',
    details: message,
    code: name,
    ...(hint && { hint }),
  };
}

function resolveHint(message) {
  const m = message.toLowerCase();
  if (m.includes('econnrefused') || m.includes('enotfound') || m.includes('getaddrinfo')) {
    return 'Check that the gateway pod is running and reachable.';
  }
  if (m.includes('timeout') || m.includes('timed out')) {
    return 'SSH or network timeout; try again in a moment.';
  }
  if (m.includes('authentication') || m.includes('auth') || m.includes('permission denied')) {
    return 'Check SSH_PRIVATE_KEY in Vercel Environment Variables (correct key and newlines).';
  }
  if (m.includes('api_key') || m.includes('runpod')) {
    return 'Check RUNPOD_API_KEY in Vercel Environment Variables.';
  }
  return null;
}

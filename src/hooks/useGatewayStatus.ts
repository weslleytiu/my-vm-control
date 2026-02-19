import { useState, useEffect, useCallback } from 'react';

type GatewayStatus = 'checking' | 'online' | 'offline' | 'error';

interface UseGatewayStatusOptions {
  url: string;
  token: string;
  intervalMs?: number;
  timeoutMs?: number;
}

export function useGatewayStatus({
  url,
  token,
  intervalMs = 30000,
  timeoutMs = 5000
}: UseGatewayStatusOptions): { status: GatewayStatus; lastChecked: Date | null; checkNow: () => void } {
  const [status, setStatus] = useState<GatewayStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = useCallback(async () => {
    setStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const res = await fetch(`${url}/health`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      // Any 2xx response means gateway is online (even if it returns HTML)
      setStatus(res.status >= 200 && res.status < 300 ? 'online' : 'error');
      setLastChecked(new Date());
    } catch (err) {
      console.error('[GatewayStatus] Check failed:', err);
      setStatus('offline');
      setLastChecked(new Date());
    }
  }, [url, token, timeoutMs]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, intervalMs);
    return () => clearInterval(interval);
  }, [checkStatus, intervalMs]);

  return { status, lastChecked, checkNow: checkStatus };
}

export function getStatusColor(status: GatewayStatus): string {
  switch (status) {
    case 'online':
      return 'text-green-400 bg-green-900/30 border-green-500/50';
    case 'offline':
      return 'text-red-400 bg-red-900/30 border-red-500/50';
    case 'error':
      return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50';
    case 'checking':
      return 'text-blue-400 bg-blue-900/30 border-blue-500/50';
    default:
      return 'text-gray-400 bg-gray-900/30 border-gray-500/50';
  }
}

export function getStatusDotColor(status: GatewayStatus): string {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'offline':
      return 'bg-red-500';
    case 'error':
      return 'bg-yellow-500';
    case 'checking':
      return 'bg-blue-500 animate-pulse';
    default:
      return 'bg-gray-500';
  }
}

export function getStatusLabel(status: GatewayStatus): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'error':
      return 'Error';
    case 'checking':
      return 'Checking...';
    default:
      return 'Unknown';
  }
}

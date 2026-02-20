import { useState, useCallback } from 'react';

interface UseGatewayControlReturn {
  isRestarting: boolean;
  isStarting: boolean;
  isLoadingLogs: boolean;
  logs: string;
  error: string | null;
  restartGateway: () => Promise<void>;
  startGateway: () => Promise<void>;
  fetchLogs: (lines?: number) => Promise<void>;
  clearLogs: () => void;
  clearError: () => void;
}

export function useGatewayControl(): UseGatewayControlReturn {
  const [isRestarting, setIsRestarting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState<string | null>(null);

  const restartGateway = useCallback(async () => {
    setIsRestarting(true);
    setError(null);
    try {
      const response = await fetch('/api/gateway-restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.details || data.error || 'Failed to restart gateway';
        throw new Error(data.hint ? `${msg} — ${data.hint}` : msg);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsRestarting(false);
    }
  }, []);

  const startGateway = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    try {
      const response = await fetch('/api/gateway-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.details || data.error || 'Failed to start gateway';
        throw new Error(data.hint ? `${msg} — ${data.hint}` : msg);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const fetchLogs = useCallback(async (lines: number = 100) => {
    setIsLoadingLogs(true);
    setError(null);
    try {
      const response = await fetch(`/api/gateway-logs?lines=${lines}`);
      const data = await response.json();

      if (!response.ok) {
        const msg = data.details || data.error || 'Failed to fetch logs';
        throw new Error(data.hint ? `${msg} — ${data.hint}` : msg);
      }

      setLogs(data.logs || 'No logs available');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLogs('');
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  const clearLogs = useCallback(() => {
    setLogs('');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isRestarting,
    isStarting,
    isLoadingLogs,
    logs,
    error,
    restartGateway,
    startGateway,
    fetchLogs,
    clearLogs,
    clearError
  };
}

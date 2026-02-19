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
        throw new Error(data.error || data.details || 'Failed to restart gateway');
      }

      // Aguarda um pouco e verifica o status
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
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
        throw new Error(data.error || data.details || 'Failed to start gateway');
      }

      // Aguarda um pouco e verifica o status
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
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
        throw new Error(data.error || data.details || 'Failed to fetch logs');
      }
      
      setLogs(data.logs || 'No logs available');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
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

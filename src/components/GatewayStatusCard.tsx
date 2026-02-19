import { useState } from 'react';
import { Activity, RefreshCw, RotateCw, Terminal, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useGatewayStatus, getStatusColor, getStatusDotColor, getStatusLabel } from '../hooks/useGatewayStatus';
import { useGatewayControl } from '../hooks/useGatewayControl';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string;
  isLoading: boolean;
  onRefresh: () => void;
}

function LogModal({ isOpen, onClose, logs, isLoading, onRefresh }: LogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Gateway Logs</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="ml-2 text-gray-400">Loading logs...</span>
            </div>
          ) : (
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all bg-gray-900 p-4 rounded-lg min-h-[200px]">
              {logs || 'No logs available'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GatewayStatusCard() {
  const { status, lastChecked, checkNow } = useGatewayStatus({});
  const { 
    isRestarting, 
    isLoadingLogs, 
    logs, 
    error, 
    restartGateway, 
    fetchLogs, 
    clearLogs, 
    clearError 
  } = useGatewayControl();
  const [showLogs, setShowLogs] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [restartSuccess, setRestartSuccess] = useState(false);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  const handleRestart = async () => {
    setShowRestartConfirm(false);
    setRestartSuccess(false);
    clearError();
    
    try {
      await restartGateway();
      setRestartSuccess(true);
      setTimeout(() => setRestartSuccess(false), 3000);
      // Aguarda e verifica o status novamente
      setTimeout(checkNow, 3000);
    } catch (err) {
      // Erro já está no estado error
    }
  };

  const handleShowLogs = async () => {
    setShowLogs(true);
    clearLogs();
    await fetchLogs(100);
  };

  const canRestart = status === 'online' && !isRestarting;

  return (
    <>
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">OpenClaw Gateway</h3>
              <p className="text-gray-400 text-sm">Status do Gateway</p>
            </div>
          </div>
          <button
            onClick={checkNow}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
            title="Verificar agora"
          >
            <RefreshCw className={`w-5 h-5 ${status === 'checking' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(status)}`}
          >
            <div className={`w-3 h-3 rounded-full ${getStatusDotColor(status)}`} />
            <span className="text-sm font-medium">{getStatusLabel(status)}</span>
          </div>
          <span className="text-gray-500 text-sm">
            Last check: {formatTime(lastChecked)}
          </span>
        </div>

        {/* Mensagens de status */}
        {restartSuccess && (
          <div className="mb-4 bg-green-900/30 border border-green-500/50 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">Gateway restart initiated successfully</span>
          </div>
        )}
        
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
            <button 
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={() => setShowRestartConfirm(true)}
            disabled={!canRestart}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title={!canRestart ? 'Gateway must be online to restart' : 'Restart Gateway'}
          >
            <RotateCw className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} />
            {isRestarting ? 'Restarting...' : 'Restart Gateway'}
          </button>
          
          <button
            onClick={handleShowLogs}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Terminal className="w-4 h-4" />
            View Logs
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-xs">
            URL: <span className="text-gray-500 font-mono">https://oyxpvo2t8uxuuk-18789.proxy.runpod.net</span>
          </p>
        </div>
      </div>

      {/* Modal de confirmação de restart */}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Restart Gateway?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will restart the OpenClaw Gateway service. You may lose connection briefly.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de logs */}
      <LogModal
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
        logs={logs}
        isLoading={isLoadingLogs}
        onRefresh={() => fetchLogs(100)}
      />
    </>
  );
}

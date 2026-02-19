import { Activity, RefreshCw } from 'lucide-react';
import { useGatewayStatus, getStatusColor, getStatusDotColor, getStatusLabel } from '../hooks/useGatewayStatus';

export default function GatewayStatusCard() {
  const { status, lastChecked, checkNow } = useGatewayStatus({});

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  return (
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

      <div className="flex items-center gap-3">
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

      <div className="mt-4 pt-4 border-t border-gray-700">
        <p className="text-gray-400 text-xs">
          URL: <span className="text-gray-500 font-mono">https://oyxpvo2t8uxuuk-18789.proxy.runpod.net</span>
        </p>
      </div>
    </div>
  );
}

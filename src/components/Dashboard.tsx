import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Server, Loader2, Power, Settings as SettingsIcon, RefreshCw, AlertCircle, Terminal, Copy, ExternalLink } from 'lucide-react';
import { listPods, startPod, stopPod, RunPodApiError, type RunPodPod } from '../api/runpod';
import Settings from './Settings';

const RUNPOD_CONSOLE_PODS_URL = 'https://console.runpod.io/pods';

function formatPodStatus(status: RunPodPod['desiredStatus']): string {
  switch (status) {
    case 'RUNNING':
      return 'Running';
    case 'EXITED':
      return 'Stopped';
    case 'TERMINATED':
      return 'Terminated';
    default:
      return status;
  }
}

function isPodRunning(pod: RunPodPod): boolean {
  return pod.desiredStatus === 'RUNNING';
}

function getInstanceType(pod: RunPodPod): string {
  if (pod.gpu?.displayName) {
    const count = pod.gpu.count > 1 ? ` ${pod.gpu.count}x` : '';
    return `${pod.gpu.displayName}${count}`;
  }
  if (pod.cpuFlavorId) return pod.cpuFlavorId;
  if (pod.machine?.gpuType?.displayName) return pod.machine.gpuType.displayName;
  if (pod.machine?.cpuType?.displayName) return pod.machine.cpuType.displayName;
  return pod.machine?.gpuTypeId ? 'GPU' : 'CPU';
}

function getRegion(pod: RunPodPod): string {
  return pod.machine?.dataCenterId ?? pod.machine?.location ?? '—';
}

function getDiskSummary(pod: RunPodPod): string {
  const parts: string[] = [];
  if (pod.containerDiskInGb != null) parts.push(`${pod.containerDiskInGb} GB container`);
  if (pod.volumeInGb != null) parts.push(`${pod.volumeInGb} GB volume`);
  if (pod.networkVolume?.size != null) parts.push(`${pod.networkVolume.size} GB network`);
  return parts.length > 0 ? parts.join(', ') : '—';
}

function getSshCommand(pod: RunPodPod): string | null {
  const ip = pod.publicIp?.trim();
  const port = pod.portMappings?.['22'];
  if (!ip || !port) return null;
  return `ssh root@${ip} -p ${port} -i ~/.ssh/id_ed25519`;
}

export default function Dashboard() {
  const { logout } = useAuth();
  const [pods, setPods] = useState<RunPodPod[]>([]);
  const [selectedPodId, setSelectedPodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySsh = (cmd: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadPods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPods({ includeMachine: true });
      setPods(list);
      if (list.length > 0) {
        setSelectedPodId((prev) => {
          if (!prev || !list.some((p) => p.id === prev)) return list[0].id;
          return prev;
        });
      }
    } catch (err) {
      const apiErr = err instanceof RunPodApiError ? err : null;
      if (apiErr?.code === 'API_KEY_NOT_CONFIGURED') {
        setError('Set RUNPOD_API_KEY in the server .env file and restart the server.');
      } else if (apiErr?.code === 'UNAUTHORIZED') {
        setError('Invalid RunPod API key. Update RUNPOD_API_KEY in the server .env file.');
      } else if (apiErr?.code === 'NETWORK') {
        setError('Cannot reach the server. Start it with: npm run server');
      } else {
        setError(apiErr?.message ?? 'Failed to load pods.');
      }
      setPods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPods();
  }, [loadPods]);

  useEffect(() => {
    if (pods.length === 0 && !loading) {
      setSelectedPodId(null);
    }
  }, [pods.length, loading]);

  const handleTogglePod = async () => {
    const pod = selectedPodId ? pods.find((p) => p.id === selectedPodId) : null;
    if (!pod) return;
    setActionLoading(true);
    setActionMessage(isPodRunning(pod) ? 'Stopping pod...' : 'Starting pod...');
    setError(null);
    try {
      if (isPodRunning(pod)) {
        await stopPod(pod.id);
      } else {
        await startPod(pod.id);
      }
      await loadPods();
    } catch (err) {
      const apiErr = err instanceof RunPodApiError ? err : null;
      if (apiErr?.code === 'UNAUTHORIZED') {
        setError('Invalid RunPod API key. Update RUNPOD_API_KEY in the server .env file.');
      } else if (apiErr?.code === 'NOT_FOUND') {
        setError('Pod no longer exists. Refreshing list.');
        await loadPods();
      } else if (apiErr?.code === 'NETWORK') {
        setError('Network error. Please try again.');
      } else {
        setError(apiErr?.message ?? 'Action failed.');
      }
    } finally {
      setActionLoading(false);
      setActionMessage('');
    }
  };

  const selectedPod = selectedPodId ? pods.find((p) => p.id === selectedPodId) : null;

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Server className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">VM Control Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          {loading && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="text-gray-400">Loading pods...</span>
            </div>
          )}

          {!loading && error && (
            <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-400 font-medium">{error}</p>
                <button
                  onClick={loadPods}
                  className="mt-2 text-sm text-red-300 hover:text-red-200 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && pods.length === 0 && !error && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
              <p className="text-gray-400 mb-4">No RunPod Pods found.</p>
              <a
                href={RUNPOD_CONSOLE_PODS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Create a Pod in RunPod Console
              </a>
            </div>
          )}

          {!loading && pods.length > 0 && (
            <>
              {pods.length > 1 && (
                <div className="mb-4">
                  <label htmlFor="pod-select" className="block text-sm font-medium text-gray-400 mb-2">
                    Select Pod
                  </label>
                  <select
                    id="pod-select"
                    value={selectedPodId ?? ''}
                    onChange={(e) => setSelectedPodId(e.target.value || null)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.id} ({formatPodStatus(p.desiredStatus)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPod && (
                <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                          {selectedPod.name || 'Unnamed Pod'}
                        </h2>
                        <p className="text-gray-400 text-sm">{selectedPod.id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={loadPods}
                          disabled={loading}
                          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <div
                          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                            isPodRunning(selectedPod)
                              ? 'bg-green-900/30 border border-green-500/50'
                              : 'bg-red-900/30 border border-red-500/50'
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isPodRunning(selectedPod) ? 'bg-green-500' : 'bg-red-500'
                            } animate-pulse`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              isPodRunning(selectedPod) ? 'text-green-400' : 'text-red-400'
                            }`}
                          >
                            {formatPodStatus(selectedPod.desiredStatus)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-6 mb-8">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 mb-1">Region</p>
                          <p className="text-white font-medium">{getRegion(selectedPod)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Instance Type</p>
                          <p className="text-white font-medium">{getInstanceType(selectedPod)}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">CPU</p>
                          <p className="text-white font-medium">{selectedPod.vcpuCount} vCPUs</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-1">Memory</p>
                          <p className="text-white font-medium">{selectedPod.memoryInGb} GB</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-400 mb-1">Disk</p>
                          <p className="text-white font-medium text-sm">{getDiskSummary(selectedPod)}</p>
                        </div>
                        {selectedPod.costPerHr != null && (
                          <div>
                            <p className="text-gray-400 mb-1">Cost</p>
                            <p className="text-white font-medium">{selectedPod.costPerHr} credits/hr</p>
                          </div>
                        )}
                        {selectedPod.publicIp && (
                          <div>
                            <p className="text-gray-400 mb-1">Public IP</p>
                            <p className="text-white font-medium font-mono text-xs">
                              {selectedPod.publicIp}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-300">Connect / Terminal</span>
                      </div>
                      <p className="text-gray-400 text-xs mb-3">
                        Use SSH in your machine or open the web terminal in RunPod.
                      </p>
                      {getSshCommand(selectedPod) ? (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <code className="flex-1 min-w-0 text-xs text-green-400 bg-gray-800 px-2 py-2 rounded break-all">
                            {getSshCommand(selectedPod)}
                          </code>
                          <button
                            type="button"
                            onClick={() => getSshCommand(selectedPod) && handleCopySsh(getSshCommand(selectedPod)!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs mb-3">
                          SSH (root@IP -p port) is available when the pod is running and has port 22 exposed.
                        </p>
                      )}
                      <a
                        href={RUNPOD_CONSOLE_PODS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline"
                      >
                        Open RunPod Console → Connect → Web Terminal or SSH
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {actionLoading && (
                      <div className="mb-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                        <span className="text-blue-400 font-medium">{actionMessage}</span>
                      </div>
                    )}

                    <button
                      onClick={handleTogglePod}
                      disabled={actionLoading || selectedPod.locked}
                      className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPodRunning(selectedPod)
                          ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20'
                          : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                      }`}
                    >
                      <Power className="w-6 h-6" />
                      {actionLoading
                        ? 'Processing...'
                        : isPodRunning(selectedPod)
                          ? 'Stop Pod'
                          : 'Start Pod'}
                    </button>
                    {selectedPod.locked && (
                      <p className="mt-2 text-sm text-gray-500 text-center">
                        This pod is locked and cannot be stopped from here.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Settings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

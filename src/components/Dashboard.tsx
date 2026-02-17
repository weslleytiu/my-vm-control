import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Server, Loader2, Power } from 'lucide-react';
import { getVMStatus, startVM, stopVM, type VMStatus } from '../utils/mockApi';

export default function Dashboard() {
  const { logout } = useAuth();
  const [vmStatus, setVmStatus] = useState<VMStatus>('stopped');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadVMStatus();
  }, []);

  const loadVMStatus = async () => {
    const status = await getVMStatus();
    setVmStatus(status);
    setInitialLoad(false);
  };

  const handleToggleVM = async () => {
    setIsLoading(true);

    if (vmStatus === 'stopped') {
      setLoadingMessage('Starting VM...');
      const newStatus = await startVM();
      setVmStatus(newStatus);
    } else {
      setLoadingMessage('Stopping VM...');
      const newStatus = await stopVM();
      setVmStatus(newStatus);
    }

    setIsLoading(false);
    setLoadingMessage('');
  };

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

          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Production VM</h2>
                  <p className="text-gray-400 text-sm">vm-prod-001</p>
                </div>

                <div className="flex items-center gap-3">
                  {initialLoad ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-full">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      <span className="text-sm text-gray-400">Loading...</span>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                      vmStatus === 'running'
                        ? 'bg-green-900/30 border border-green-500/50'
                        : 'bg-red-900/30 border border-red-500/50'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        vmStatus === 'running' ? 'bg-green-500' : 'bg-red-500'
                      } animate-pulse`} />
                      <span className={`text-sm font-medium ${
                        vmStatus === 'running' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {vmStatus === 'running' ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6 mb-8">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">Region</p>
                    <p className="text-white font-medium">us-east-1</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Instance Type</p>
                    <p className="text-white font-medium">t3.medium</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">CPU</p>
                    <p className="text-white font-medium">2 vCPUs</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Memory</p>
                    <p className="text-white font-medium">4 GB</p>
                  </div>
                </div>
              </div>

              {isLoading && (
                <div className="mb-6 bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                  <span className="text-blue-400 font-medium">{loadingMessage}</span>
                </div>
              )}

              <button
                onClick={handleToggleVM}
                disabled={isLoading || initialLoad}
                className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  vmStatus === 'running'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                }`}
              >
                <Power className="w-6 h-6" />
                {isLoading ? 'Processing...' : vmStatus === 'running' ? 'Stop VM' : 'Start VM'}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>All VM operations are simulated for demonstration purposes</p>
          </div>
        </div>
      </main>
    </div>
  );
}

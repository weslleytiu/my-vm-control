/**
 * @deprecated This mock API is no longer used. The app uses the RunPod API (src/api/runpod.ts) for real Pod control.
 * Kept for reference or optional "demo mode" in the future.
 */
export type VMStatus = 'running' | 'stopped';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const VM_STATE_KEY = 'vm_state';

export const getVMStatus = async (): Promise<VMStatus> => {
  await delay(500);
  const savedState = localStorage.getItem(VM_STATE_KEY);
  return (savedState as VMStatus) || 'stopped';
};

export const startVM = async (): Promise<VMStatus> => {
  await delay(2000);
  localStorage.setItem(VM_STATE_KEY, 'running');
  return 'running';
};

export const stopVM = async (): Promise<VMStatus> => {
  await delay(2000);
  localStorage.setItem(VM_STATE_KEY, 'stopped');
  return 'stopped';
};

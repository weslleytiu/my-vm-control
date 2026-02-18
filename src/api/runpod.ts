const API_BASE =
  import.meta.env.VITE_API_URL?.trim() ??
  (import.meta.env.DEV ? 'http://localhost:3000/api' : '');

export type PodDesiredStatus = 'RUNNING' | 'EXITED' | 'TERMINATED';

export interface RunPodGpu {
  id?: string;
  count: number;
  displayName?: string;
}

export interface RunPodMachine {
  dataCenterId?: string;
  location?: string;
  gpuTypeId?: string;
  gpuType?: { displayName?: string };
  cpuTypeId?: string;
  cpuType?: { displayName?: string };
}

export interface RunPodNetworkVolume {
  id?: string;
  name?: string;
  size?: number;
  dataCenterId?: string;
}

export interface RunPodPod {
  id: string;
  name?: string | null;
  desiredStatus: PodDesiredStatus;
  vcpuCount: number;
  memoryInGb: number;
  gpu?: RunPodGpu | null;
  cpuFlavorId?: string | null;
  costPerHr?: number;
  publicIp?: string | null;
  machine?: RunPodMachine | null;
  endpointId?: string | null;
  locked?: boolean;
  containerDiskInGb?: number;
  volumeInGb?: number;
  networkVolume?: RunPodNetworkVolume | null;
  /** Port mappings: internal port -> external port (e.g. { "22": 17445 } for SSH) */
  portMappings?: Record<string, number> | null;
}

export class RunPodApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: 'UNAUTHORIZED' | 'NOT_FOUND' | 'NETWORK' | 'API_KEY_NOT_CONFIGURED' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'RunPodApiError';
  }
}

async function runpodFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const headers: HeadersInit = {
    ...(options.headers as Record<string, string>),
  };
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const res = await fetch(url, { ...options, headers });
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    throw new RunPodApiError(message, undefined, 'NETWORK');
  }
}

async function handleResponse<T>(res: Response, parse: (data: unknown) => T): Promise<T> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (res.status === 503) {
    const err = body && typeof body === 'object' && body !== null && 'code' in body
      ? (body as { code?: string; error?: string })
      : {};
    if (err.code === 'API_KEY_NOT_CONFIGURED') {
      throw new RunPodApiError(
        err.error ?? 'Server not configured. Set RUNPOD_API_KEY in the server .env and restart.',
        503,
        'API_KEY_NOT_CONFIGURED'
      );
    }
  }
  if (res.status === 401) {
    throw new RunPodApiError('Invalid or expired API key', 401, 'UNAUTHORIZED');
  }
  if (res.status === 404) {
    throw new RunPodApiError('Pod not found', 404, 'NOT_FOUND');
  }
  if (!res.ok) {
    throw new RunPodApiError(
      `Request failed: ${res.status} ${res.statusText}`,
      res.status,
      'UNKNOWN'
    );
  }
  return parse(body);
}

export interface ListPodsOptions {
  includeMachine?: boolean;
}

/**
 * List Pods via backend proxy. Excludes Serverless workers (endpointId set).
 */
export async function listPods(options: ListPodsOptions = {}): Promise<RunPodPod[]> {
  const params = new URLSearchParams();
  if (options.includeMachine !== false) {
    params.set('includeMachine', 'true');
  }
  const query = params.toString();
  const path = query ? `/pods?${query}` : '/pods';
  const res = await runpodFetch(path);
  const data = await handleResponse(res, (body) => body as RunPodPod[]);
  const pods = Array.isArray(data) ? data : [];
  return pods.filter((p) => !p.endpointId);
}

/**
 * Get a single Pod by ID.
 */
export async function getPod(podId: string): Promise<RunPodPod> {
  const res = await runpodFetch(`/pods/${encodeURIComponent(podId)}?includeMachine=true`);
  return await handleResponse(res, (body) => body as RunPodPod);
}

/**
 * Start or resume a Pod.
 */
export async function startPod(podId: string): Promise<void> {
  const res = await runpodFetch(`/pods/${encodeURIComponent(podId)}/start`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (res.status === 503 && body && typeof body === 'object' && 'code' in body && (body as { code: string }).code === 'API_KEY_NOT_CONFIGURED') {
      throw new RunPodApiError('Server not configured. Set RUNPOD_API_KEY in the server .env.', 503, 'API_KEY_NOT_CONFIGURED');
    }
    if (res.status === 401) throw new RunPodApiError('Invalid or expired API key', 401, 'UNAUTHORIZED');
    if (res.status === 404) throw new RunPodApiError('Pod not found', 404, 'NOT_FOUND');
    throw new RunPodApiError(`Failed to start pod: ${res.status}`, res.status, 'UNKNOWN');
  }
}

/**
 * Stop a Pod.
 */
export async function stopPod(podId: string): Promise<void> {
  const res = await runpodFetch(`/pods/${encodeURIComponent(podId)}/stop`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (res.status === 503 && body && typeof body === 'object' && 'code' in body && (body as { code: string }).code === 'API_KEY_NOT_CONFIGURED') {
      throw new RunPodApiError('Server not configured. Set RUNPOD_API_KEY in the server .env.', 503, 'API_KEY_NOT_CONFIGURED');
    }
    if (res.status === 401) throw new RunPodApiError('Invalid or expired API key', 401, 'UNAUTHORIZED');
    if (res.status === 404) throw new RunPodApiError('Pod not found', 404, 'NOT_FOUND');
    throw new RunPodApiError(`Failed to stop pod: ${res.status}`, res.status, 'UNKNOWN');
  }
}

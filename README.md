# my-vm-control

A dashboard to manage RunPod Pods and an OpenClaw Gateway from one place. List, start, stop, restart, and reset GPU/CPU instances, run remote setup scripts via SSH, and monitor your gateway — all from a single React UI.

## Features

- **Pod management** — list, start, stop, restart, and reset RunPod Pods.
- **Pod details** — view region, instance type, vCPUs, memory, disk, cost, and public IP.
- **SSH quick-connect** — displays the SSH command for any running pod with a one-click copy button.
- **Remote exec** — run an OpenClaw setup script on a pod directly from the dashboard (via SSH).
- **OpenClaw Gateway** — monitor health, start, restart, and view logs of the gateway service.
- **Settings panel** — configure gateway pod and other options from the UI.
- **Vercel-ready** — deploy as serverless functions with zero long-running processes.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend (local) | Express, Node.js |
| Backend (production) | Vercel Serverless Functions |
| SSH | ssh2 (Node.js) |
| Icons | lucide-react |

## Quick start

### 1. Get a RunPod API key

1. Open [RunPod Console → Settings → API Keys](https://docs.runpod.io/get-started/api-keys).
2. Create a new key (Read/Write for Pods).
3. Copy it.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```
RUNPOD_API_KEY=your_runpod_api_key_here
```

See `.env.example` for all available options (`PORT`, `CORS_ORIGIN`, `SSH_PRIVATE_KEY`, `GATEWAY_POD_ID`).

### 3. Install dependencies

```bash
npm install
```

### 4. Run the app

**Option A — two terminals**

```bash
# Terminal 1: backend proxy
npm run server

# Terminal 2: frontend
npm run dev
```

**Option B — single command**

```bash
npm run dev:all
```

Then open http://localhost:5173.

## Project structure

```
├── api/                  # Vercel serverless functions
│   ├── pods.js           # GET /api/pods
│   ├── pods/[id].js      # GET /api/pods/:id
│   ├── pods/[id]/start.js
│   ├── pods/[id]/stop.js
│   ├── pods/[id]/restart.js
│   ├── pods/[id]/reset.js
│   ├── pods/[id]/exec.js # POST — run a command on the pod via SSH
│   ├── gateway-health.js
│   ├── gateway-start.js
│   ├── gateway-restart.js
│   └── gateway-logs.js
├── server/
│   └── index.js          # Express dev server (mirrors the api/ routes)
├── src/
│   ├── api/runpod.ts     # Frontend API client
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── GatewayStatusCard.tsx
│   │   ├── Login.tsx
│   │   └── Settings.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   └── hooks/
│       ├── useGatewayControl.ts
│       └── useGatewayStatus.ts
├── lib/                  # Shared server-side utilities
├── .env.example
├── vercel.json
└── package.json
```

## Deploy on Vercel

1. Push the repo to GitHub and [import the project in Vercel](https://vercel.com/new).
2. In **Settings → Environment Variables**, add:
   - `RUNPOD_API_KEY` — your RunPod API key
   - `SSH_PRIVATE_KEY` — full private key content (for gateway and exec features)
   - `GATEWAY_POD_ID` — (optional) the pod ID where the gateway runs
3. Deploy. The `/api/*` routes run as serverless functions; the frontend is served as static files.

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `RUNPOD_API_KEY` | Yes | — | RunPod API key |
| `PORT` | No | `3000` | Express server port (local dev only) |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin (local dev only) |
| `SSH_PRIVATE_KEY` | No | — | SSH private key content (for Vercel / gateway ops) |
| `SSH_PRIVATE_KEY_PATH` | No | `~/.ssh/id_ed25519` | Path to SSH key file (local dev only) |
| `GATEWAY_POD_ID` | No | — | Pod ID where the OpenClaw Gateway runs |
| `VITE_API_URL` | No | auto-detected | Override the API base URL for the frontend |

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (frontend only) |
| `npm run server` | Start Express backend proxy |
| `npm run dev:all` | Start both frontend and backend concurrently |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run preview` | Preview the production build locally |

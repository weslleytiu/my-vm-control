# my-vm-control

A simple dashboard to control RunPod Pods: list, start, and stop your GPU/CPU instances from one place.

## RunPod integration

The app uses a **backend proxy** to talk to the [RunPod API](https://docs.runpod.io/overview), so the API key never runs in the browser and CORS is avoided.

### 1. Get a RunPod API key

1. Open [RunPod Console → Settings → API Keys](https://docs.runpod.io/get-started/api-keys).
2. Create a new API key (e.g. Read/Write for Pods).
3. Copy the key.

### 2. Configure the server

In the project root, create a `.env` file (see `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` and set your key:

```
RUNPOD_API_KEY=your_runpod_api_key_here
```

### 3. Run the app

**Option A – two terminals**

```bash
# Terminal 1: start the proxy server
npm run server

# Terminal 2: start the frontend
npm run dev
```

**Option B – one command**

```bash
npm run dev:all
```

Then open http://localhost:5173, sign in with the demo credentials, and your Pods will appear (if the server has a valid `RUNPOD_API_KEY`).

### What you can do

- **List Pods**: See all your RunPod Pods (excluding Serverless workers).
- **Start / Stop**: Start or stop a Pod from the dashboard.
- **Details**: View region, instance type, CPU, memory, cost, and public IP for each Pod.

### Deploy on Vercel (no server to run)

The project is set up for [Vercel](https://vercel.com): the proxy runs as **serverless functions** under `/api`, so there is no long-running server.

1. Push the repo to GitHub and [import the project in Vercel](https://vercel.com/new).
2. In the Vercel project, go to **Settings → Environment Variables** and add:
   - **Name**: `RUNPOD_API_KEY`  
   - **Value**: your RunPod API key  
   (Apply to Production, Preview, Development as needed.)
3. Deploy. The frontend is built from the repo; the `/api/pods` routes are deployed as serverless functions. The app will call them on the same origin (no CORS).

Locally you still use the Express server (`npm run server` + `npm run dev` or `npm run dev:all`); in production on Vercel, only the serverless API and static frontend are used.

### Frontend API URL (optional)

- **Local dev**: the frontend uses `http://localhost:3000/api` (Express server).
- **Production (Vercel)**: the frontend uses relative URLs (`/api`), so no extra config.
- To point the frontend at another API base URL, set `VITE_API_URL` (e.g. `VITE_API_URL=https://your-api.com/api`) and rebuild.

# Code Errors & Issues — my-vm-control

Analysis date: 2026-02-21

---

## 1. CRITICAL — `require('fs')` in ES Module (`server/index.js:105`)

The project is configured as `"type": "module"` in `package.json`, which means all `.js` files are treated as ES modules. However, `server/index.js` line 105 uses `require('fs')`:

```js
privateKey: require('fs').readFileSync(privateKeyPath),
```

This will throw **`ReferenceError: require is not defined`** at runtime when the `executeSshCommand` function is called.

**Fix:** Replace with an ES module import at the top of the file:

```js
import { readFileSync } from 'fs';
```

Then use `readFileSync(privateKeyPath)` directly.

---

## 2. SECURITY — Hardcoded Secret Token

The gateway token is hardcoded in plain text in two files:

- **`server/index.js:199`** — `const GATEWAY_TOKEN = 'dcb99a5cbec2dfd354b3303e6bd8e986bb1395f4e6cbeb2d';`
- **`api/gateway-health.js:4`** — `const GATEWAY_TOKEN = 'dcb99a5cbec2dfd354b3303e6bd8e986bb1395f4e6cbeb2d';`

This token is committed to version control and visible to anyone with access to the repository.

**Fix:** Move the token to an environment variable (e.g. `GATEWAY_TOKEN`) and read it from `process.env.GATEWAY_TOKEN`.

---

## 3. SECURITY — Hardcoded Authentication Credentials (`src/contexts/AuthContext.tsx`)

Lines 11-12 contain hardcoded login credentials:

```ts
const VALID_EMAIL = 'admin@admin.com';
const VALID_PASSWORD = 'admin123';
```

Authentication is handled entirely on the client side with no server-side validation, which means any user can bypass it by modifying `localStorage`.

**Fix:** Implement proper server-side authentication (e.g. using Supabase Auth, which is already a dependency).

---

## 4. BUG — Gateway API Calls Fail in Dev Mode

`src/hooks/useGatewayControl.ts` and `src/hooks/useGatewayStatus.ts` use relative URLs (e.g. `/api/gateway-restart`, `/api/gateway-health`) that go to the Vite dev server (port 5173).

However, the Express backend runs on port 3000, and `vite.config.ts` does **not** configure a proxy for `/api` routes. In contrast, `src/api/runpod.ts` correctly handles this by setting `API_BASE` to `http://localhost:3000/api` in dev mode.

**Affected files:**
- `src/hooks/useGatewayControl.ts:27,52,77` — calls to `/api/gateway-restart`, `/api/gateway-start`, `/api/gateway-logs`
- `src/hooks/useGatewayStatus.ts:26` — calls to `/api/gateway-health`

**Fix (option A):** Add a Vite proxy in `vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

**Fix (option B):** Use the same `API_BASE` logic from `runpod.ts` in the gateway hooks.

---

## 5. CODE QUALITY — Portuguese Strings and Comments (violates "all code in English" rule)

Several files contain Portuguese text:

| File | Line(s) | Text |
|---|---|---|
| `src/components/GatewayStatusCard.tsx` | 95, 109 | `// Erro já está no estado error` |
| `src/components/GatewayStatusCard.tsx` | 133 | `Status do Gateway` |
| `src/components/GatewayStatusCard.tsx` | 139 | `title="Verificar agora"` |
| `src/components/GatewayStatusCard.tsx` | 157 | `{/* Mensagens de status */}` |
| `src/components/GatewayStatusCard.tsx` | 186 | `{/* Botões de ação */}` |
| `src/components/GatewayStatusCard.tsx` | 226 | `{/* Modal de confirmação de start */}` |
| `src/components/GatewayStatusCard.tsx` | 252 | `{/* Modal de confirmação de restart */}` |
| `server/index.js` | 326 | `// Continua tentando os outros comandos` |

**Fix:** Translate all comments and user-facing strings to English.

---

## 6. CODE QUALITY — Hardcoded Gateway URL in Multiple Files

The gateway URL `https://oyxpvo2t8uxuuk-18789.proxy.runpod.net` is hardcoded in:

- `server/index.js:198`
- `api/gateway-health.js:3`
- `src/components/GatewayStatusCard.tsx:221`

Similarly, `GATEWAY_POD_ID` defaults to `'oyxpvo2t8uxuuk'` in:

- `server/index.js:224,260,297`
- `api/gateway-restart.js:98`
- `api/gateway-start.js:98`
- `api/gateway-logs.js:100`

**Fix:** Move `GATEWAY_URL` to an environment variable and derive the URL from `GATEWAY_POD_ID` where needed.

---

## 7. CODE QUALITY — Massive Code Duplication Across API Files

The following functions are copy-pasted across 4+ files with minor variations:

| Function | Duplicated in |
|---|---|
| `corsHeaders()` | `api/pods.js`, `api/pods/[id].js`, `api/pods/[id]/start.js`, `api/pods/[id]/stop.js`, `api/pods/[id]/restart.js`, `api/pods/[id]/reset.js`, `api/pods/[id]/exec.js`, `api/gateway-health.js`, `api/gateway-logs.js`, `api/gateway-restart.js`, `api/gateway-start.js` |
| `jsonResponse()` | Same 11 files |
| `getIdFromPath()` | `api/pods/[id].js`, `api/pods/[id]/start.js`, `api/pods/[id]/stop.js`, `api/pods/[id]/restart.js`, `api/pods/[id]/reset.js`, `api/pods/[id]/exec.js` |
| `getPodSshDetails()` | `api/pods/[id]/exec.js`, `api/gateway-logs.js`, `api/gateway-restart.js`, `api/gateway-start.js`, `server/index.js` |
| `executeSshCommand()` | Same 5 files |
| `normalizePrivateKey()` | `api/pods/[id]/exec.js`, `api/gateway-logs.js`, `api/gateway-restart.js`, `api/gateway-start.js` |

**Fix:** Extract shared utilities into `lib/` modules (e.g. `lib/cors.js`, `lib/ssh.js`) and import them.

---

## 8. CODE QUALITY — Open Graph Meta Tags Point to bolt.new (`index.html`)

Lines 8-10 of `index.html`:

```html
<meta property="og:image" content="https://bolt.new/static/og_default.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://bolt.new/static/og_default.png" />
```

These reference an external service (bolt.new) unrelated to this project.

**Fix:** Replace with project-specific images or remove the tags.

---

## 9. UI — Background Color Inconsistent with Dark Theme

Both `Dashboard.tsx:249` and `Login.tsx:22` use `bg-green-100` (light green) as the page background, but all cards and components use a dark theme (`bg-gray-800`, `bg-gray-700`, `text-white`).

This creates a jarring visual contrast between the light green page and the dark UI cards.

**Fix:** Change to a dark background like `bg-gray-900` to match the overall dark theme, or redesign the cards for a light theme.

---

## 10. CODE QUALITY — Duplicate Backend Implementations

The project has two separate backend implementations with divergent logic:

- **`server/index.js`** — Express server for local development (reads SSH key from **file system**)
- **`api/` directory** — Vercel serverless functions (reads SSH key from **env var**)

These implementations have different error handling, different SSH key sources, and different gateway command strings, making it easy for them to drift out of sync.

**Fix:** Ideally, share the same handler logic between both backends, or remove the Express server in favor of Vercel's local dev (`vercel dev`).

---

## Summary

| # | Severity | Description | File(s) |
|---|---|---|---|
| 1 | **Critical** | `require('fs')` in ESM — runtime crash | `server/index.js` |
| 2 | **Security** | Hardcoded gateway token | `server/index.js`, `api/gateway-health.js` |
| 3 | **Security** | Client-side-only auth with hardcoded credentials | `src/contexts/AuthContext.tsx` |
| 4 | **Bug** | Gateway API calls fail in dev mode (missing proxy) | `useGatewayControl.ts`, `useGatewayStatus.ts`, `vite.config.ts` |
| 5 | **Quality** | Portuguese comments/strings | `GatewayStatusCard.tsx`, `server/index.js` |
| 6 | **Quality** | Hardcoded gateway URL in multiple files | 6 files |
| 7 | **Quality** | Massive code duplication across API files | 11 files |
| 8 | **Quality** | OG meta tags point to bolt.new | `index.html` |
| 9 | **UI** | Light green background clashes with dark theme | `Dashboard.tsx`, `Login.tsx` |
| 10 | **Quality** | Two divergent backend implementations | `server/index.js` vs `api/` |

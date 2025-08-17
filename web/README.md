# CollabBoard Lite – Web

Vite + React + TypeScript single-page app for the embedded whiteboard demo. Uses Tailwind CSS, React Konva, and socket.io-client.

## Local Development
1. Copy env:
   - `cp .env.example .env`
   - Set `VITE_SERVER_URL` to your backend URL (`http://localhost:8080` in dev)
2. Install and start:
   ```bash
   npm install
   npm run dev
   ```
3. Open http://localhost:5173

## Build
```bash
npm run build
```
Outputs to `dist/`.

## Deploy (Netlify)
- Create a new site from this folder.
- Env vars:
  - `VITE_SERVER_URL=https://<your-render-service>.onrender.com`
  - `VITE_RESET_TOKEN=<optional, same as server RESET_TOKEN>`
- `public/_headers` sets `frame-ancestors` so the app can be embedded in your portfolio.
- `public/_redirects` enables SPA routing fallback.

# CollabBoard Lite – Embedded Real-Time Whiteboard Demo

A lightweight, embeddable real-time collaborative whiteboard intended to run inside your portfolio at `nishpallapu.com/collabboard`.

Visitors can draw, add shapes/text, see others live via cursors, reset the board (with a token), and export as PNG.

## Tech Stack
- Frontend: React + TypeScript, Vite, Tailwind CSS, React Konva, socket.io-client
- Backend: Node.js, Express, Socket.io, Helmet, optional MongoDB Atlas
- Deploy: Server on Render/Railway; Web on Netlify (with iframe headers)

## Structure
```
collaborativewhiteboard/
  server/           # Express + Socket.io API
  web/              # Vite + React app
```

## Local Development
1. Backend
   - Copy env: `cp server/.env.example server/.env`
   - Edit `ALLOWED_ORIGINS` to include `http://localhost:5173`
   - Start:
     ```bash
     npm install --prefix server
     npm run dev --prefix server
     ```
   - Server runs at `http://localhost:8080` by default

2. Frontend
   - Copy env: `cp web/.env.example web/.env`
   - Set `VITE_SERVER_URL=http://localhost:8080`
   - Start:
     ```bash
     npm install --prefix web
     npm run dev --prefix web
     ```
   - Web runs at `http://localhost:5173`

Open http://localhost:5173 in multiple tabs to test live collaboration.

## Deployment
### Server (Render)
- Create a new Render Web Service pointing to `collaborativewhiteboard/server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `ALLOWED_ORIGINS=https://<your-netlify-site>.netlify.app,https://nishpallapu.com`
  - `FRAME_ANCESTORS=https://nishpallapu.com,https://www.nishpallapu.com`
  - `RESET_TOKEN=<choose-strong-token>`
  - Optional persistence: `MONGO_URI=<mongodb+srv://...>`

### Web (Netlify)
- Create a new Netlify site from `collaborativewhiteboard/web`
- Environment variables:
  - `VITE_SERVER_URL=https://<your-render-service>.onrender.com`
  - `VITE_RESET_TOKEN=<same-as-server RESET_TOKEN>` (optional, only if you want the Reset button active)
- The `public/_headers` already sets `Content-Security-Policy: frame-ancestors` to allow embedding from your root domain.

## Portfolio Integration (React Router)
In your portfolio repo (CRA with React Router), add a route `/collabboard` that renders an iframe:

```tsx
import React from 'react';

export function CollabboardDemo() {
  return (
    <div style={{ height: '100vh' }}>
      <iframe
        src="https://<your-netlify-site>.netlify.app"
        title="CollabBoard Lite"
        style={{ border: 0, width: '100%', height: '100%' }}
        allow="fullscreen"
      />
    </div>
  );
}
```

- Make sure your portfolio navigation links to `/collabboard`.
- Because the web app sets `frame-ancestors` to your domain, the iframe will render without X-Frame-Options/CSP issues.

## API and Events
- HTTP:
  - `GET /health` – health probe
  - `GET /state` – current elements (for debug)
  - `POST /reset` – clears board, requires `Authorization: Bearer <RESET_TOKEN>`
- WebSocket (Socket.io):
  - Client -> Server: `cursor:move`, `draw:stroke`, `draw:element`, `board:reset`
  - Server -> Client: `init`, `cursor:move`, `draw:stroke`, `draw:element`, `board:reset`

## Security & Embedding
- Server uses Helmet CSP. Set `FRAME_ANCESTORS` to your embed parent(s).
- CORS enforced via `ALLOWED_ORIGINS` to restrict Socket.io/Web fetches.
- Netlify headers in `web/public/_headers` set `frame-ancestors` for the static web app.

## Notes
- PNG export uses the canvas; remote cursors are rendered in a separate layer and might not be included.
- MongoDB Atlas persistence is optional; if not configured, server uses in-memory state.

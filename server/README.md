# CollabBoard Lite - Server

Node.js Express + Socket.io backend for the embedded whiteboard demo.

## Endpoints
- `GET /health` – health check
- `GET /state` – current elements (debug)
- `POST /reset` – clears the board. Requires `Authorization: Bearer <RESET_TOKEN>`

## Socket.io Events
- Client -> Server:
  - `cursor:move` { x, y, name, color }
  - `draw:stroke` { id, type:'stroke', color, width, points:number[] }
  - `draw:element` rect | line | circle | text element objects
  - `board:reset` token
- Server -> Client:
  - `init` { elements }
  - `cursor:move` { id, x, y, name, color }
  - `draw:stroke` stroke
  - `draw:element` element
  - `board:reset`

## Running locally
1. `cp .env.example .env` and edit as needed
2. `npm install`
3. `npm run dev`

## Deploy (Render example)
- Create a new Web Service from this folder.
- Runtime: Node, Build command: `npm install`, Start command: `npm start`
- Add Environment Variables: `ALLOWED_ORIGINS`, `RESET_TOKEN`, and optionally `MONGO_URI`.

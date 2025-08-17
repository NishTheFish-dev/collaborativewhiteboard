# Nishanth Pallapu - Collaborative Whiteboard

A modern, real-time collaborative whiteboard embedded in my portfolio at https://nishpallapu.com/collaborativewhiteboard. It showcases real-time systems, WebSockets, and an interactive UI for multiuser drawing.

## Features
- Real-time multiuser drawing powered by Socket.IO
- Freehand strokes, shapes (rect/line/circle), and text elements
- Live cursors with user name and color
- Time-limited collaboration codes for secure room joining
- PNG export of the canvas
- Board reset (protected by token)
- Embeddable via iframe with CSP `frame-ancestors`
- MongoDB persistence for room state
- Responsive UI (Tailwind CSS) and dark theme

## Technologies Used
- Frontend: React + TypeScript, Vite, Tailwind CSS, React Konva, socket.io-client
- Backend: Node.js, Express, Socket.io, Helmet, MongoDB Atlas
- Deploy: Server on Render; Web on Vercel (with iframe headers)
# Collaborative Whiteboard

A simple real-time collaborative whiteboard embedded in my portfolio at https://nishpallapu.com/collaborativewhiteboard. It showcases real-time systems, WebSockets, and an interactive UI for multiuser drawing.

I wanted to build my first web application with real-time collaboration features, so I decided to try making a whiteboard web app that was simple to use and easy to integrate into any website. The hardest part of creating this project was learning how to implement WebSockets, as well as communication between the app and the server for coordinating join codes. CORS issues soon arose as I tried to embed the app into my site, but those were easily fixed by setting the necessary permissions for the whiteboard site. Overall this was a fun project to explore real-time web collaboration, and it helped me develop my knowledge on real-time systems, as well as further my knowledge of building web applications with React.

## Features
- Real-time multiuser drawing powered by Socket.IO
- Freehand strokes, shapes (rect/line/circle), and text elements
- Live cursors with user name and color
- Time-limited collaboration codes for secure room joining
- PNG export of the canvas
- Board reset (protected by token)
- Embeddable via iframe with CSP `frame-ancestors`
- MongoDB persistence for room state if needed
- Responsive UI (Tailwind CSS) and dark theme

## Technologies Used
- Frontend: React + TypeScript, Vite, Tailwind CSS, React Konva, socket.io-client
- Backend: Node.js, Express, Socket.io, Helmet, MongoDB Atlas
- Deploy: Server on Render; Web on Vercel (with iframe headers)
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 8080;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const RESET_TOKEN = process.env.RESET_TOKEN || '';
const MONGO_URI = process.env.MONGO_URI || '';
const MONGO_DB = process.env.MONGO_DB || 'collabboardlite';
const MONGO_COLLECTION = process.env.MONGO_COLLECTION || 'boards';
const BOARD_ID = process.env.BOARD_ID || 'default';

const FRAME_ANCESTORS = (process.env.FRAME_ANCESTORS || 'https://nishpallapu.com,https://www.nishpallapu.com')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Collaboration rooms and limited-time codes
const CODE_TTL_MS = parseInt(process.env.CODE_TTL_MS || '600000', 10); // 10 minutes default

// Per-room in-memory state and active codes
// rooms: roomId -> { elements: [] }
const rooms = new Map();
// codes: code -> { roomId, expiresAt }
const codes = new Map();

function genCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (codes.has(code));
  return code;
}

function pruneExpiredCodes() {
  const now = Date.now();
  for (const [c, info] of codes) {
    if (info.expiresAt <= now) codes.delete(c);
  }
}

function getRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = { elements: [] };
    rooms.set(roomId, room);
  }
  return room;
}

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", '*'],
        frameAncestors: ["'self'", ...FRAME_ANCESTORS],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Build regex patterns for wildcard origin support (e.g., https://*.vercel.app)
const originPatterns = ALLOWED_ORIGINS.map((pat) => {
  if (pat === '*') return /.*/;
  const escaped = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = '^' + escaped.replace(/\\\*/g, '.*') + '$';
  try {
    return new RegExp(regexStr);
  } catch {
    return new RegExp('^' + escaped + '$');
  }
});

const corsOptions = {
  origin: (origin, cb) => {
    // Allow server-to-server, curl, or same-origin requests with no Origin header
    if (!origin) return cb(null, true);
    // Allow if any pattern matches
    if (originPatterns.some((re) => re.test(origin))) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: false,
};
app.use(cors(corsOptions));

app.get('/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// Per-room in-memory state is maintained via `rooms` map defined above.

// MongoDB setup (optional)
let mongoClient = null;
let collection = null;

async function initMongo() {
  if (!MONGO_URI) return;
  mongoClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await mongoClient.connect();
  const db = mongoClient.db(MONGO_DB);
  collection = db.collection(MONGO_COLLECTION);
  await collection.createIndex({ boardId: 1 }, { unique: true });
  console.log('[mongo] connected and state loaded');
}

async function loadRoomState(roomId) {
  if (!collection) return;
  const doc = await collection.findOne({ boardId: roomId });
  if (doc && Array.isArray(doc.elements)) {
    getRoom(roomId).elements = doc.elements;
  }
}

async function saveRoomState(roomId) {
  if (!collection) return;
  const room = getRoom(roomId);
  await collection.updateOne(
    { boardId: roomId },
    { $set: { boardId: roomId, elements: room.elements, updatedAt: new Date() } },
    { upsert: true }
  );
}

app.get('/state', async (req, res) => {
  const roomId = (req.query.roomId || BOARD_ID).toString();
  try {
    await loadRoomState(roomId);
  } catch {}
  const room = getRoom(roomId);
  res.json({ elements: room.elements });
});

// Create a time-limited 6-digit collab code and its room
app.post('/collab/create', (req, res) => {
  pruneExpiredCodes();
  const roomId = `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  rooms.set(roomId, { elements: [] });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + CODE_TTL_MS;
  codes.set(code, { roomId, expiresAt });
  res.json({ ok: true, code, expiresAt });
});

app.post('/reset', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!RESET_TOKEN || token !== RESET_TOKEN) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }
  rooms.forEach((room) => (room.elements = []));
  try {
    if (collection) {
      for (const roomId of rooms.keys()) {
        await saveRoomState(roomId);
      }
    }
  } catch {}
  io.emit('board:reset');
  res.json({ ok: true });
});

io.on('connection', (socket) => {
  socket.data.roomId = null;

  socket.on('room:join', async (payload = {}, cb) => {
    try {
      pruneExpiredCodes();
      const code = String(payload.code || '');
      const info = codes.get(code);
      if (!info || info.expiresAt <= Date.now()) {
        if (cb) cb({ ok: false, error: 'Invalid or expired code' });
        return;
      }
      const { roomId } = info;
      socket.join(roomId);
      socket.data.roomId = roomId;
      try {
        await loadRoomState(roomId);
      } catch {}
      const room = getRoom(roomId);
      socket.emit('init', { elements: room.elements });
      if (cb) cb({ ok: true, roomId, expiresAt: info.expiresAt });
    } catch (e) {
      if (cb) cb({ ok: false, error: 'Join failed' });
    }
  });

  socket.on('cursor:move', (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('cursor:move', { ...payload, id: socket.id });
  });

  socket.on('draw:stroke', async (stroke) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    // stroke: { id, type:'stroke', color, width, points: number[] }
    const room = getRoom(roomId);
    const idx = room.elements.findIndex((e) => e.id === stroke.id);
    if (idx === -1) {
      room.elements.push(stroke);
    } else {
      const existing = room.elements[idx];
      const mergedPoints = Array.isArray(stroke.points)
        ? (existing.points || []).concat(stroke.points)
        : (existing.points || []);
      room.elements[idx] = {
        ...existing,
        ...stroke,
        points: mergedPoints,
      };
    }
    io.to(roomId).emit('draw:stroke', stroke);
    try {
      await saveRoomState(roomId);
    } catch {}
  });

  socket.on('draw:element', async (element) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    // element: rect | line | circle | text
    const room = getRoom(roomId);
    room.elements.push(element);
    io.to(roomId).emit('draw:element', element);
    try {
      await saveRoomState(roomId);
    } catch {}
  });

  socket.on('board:reset', async (token) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    if (!RESET_TOKEN || token !== RESET_TOKEN) return;
    const room = getRoom(roomId);
    room.elements = [];
    io.to(roomId).emit('board:reset');
    try {
      await saveRoomState(roomId);
    } catch {}
  });
});

server.listen(PORT, async () => {
  try {
    await initMongo();
  } catch (e) {
    console.warn('[mongo] optional init failed:', e.message);
  }
  console.log(`CollabBoard Lite server listening on :${PORT}`);
});

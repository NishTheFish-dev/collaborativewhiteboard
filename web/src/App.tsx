import React, { useEffect, useMemo, useRef, useState } from 'react';
import Toolbar from './components/Toolbar';
import Board from './components/Board';
import { Element, RemoteCursor, Tool } from './types';
import { getSocket } from './socket';

const ENV_URL = (import.meta.env.VITE_SERVER_URL as string | undefined);
// Default to :8080 on the same host for local development
const DEFAULT_URL = `${location.protocol}//${location.hostname}:8080`;
const SERVER_URL = (ENV_URL && ENV_URL.trim()) || DEFAULT_URL;
if (!ENV_URL || !ENV_URL.trim()) {
  console.warn('[web] VITE_SERVER_URL not set or empty; defaulting to', SERVER_URL);
}
const RESET_TOKEN = import.meta.env.VITE_RESET_TOKEN as string | undefined;

const nameFromSeed = () => `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
const palette = [
  '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#84cc16',
];
const colorFromName = (n: string) => {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

export default function App() {
  const [name] = useState(nameFromSeed);
  const myColor = useMemo(() => colorFromName(name), [name]);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<string>('#22c55e');
  const [width, setWidth] = useState<number>(3);
  const [elements, setElements] = useState<Element[]>([]);
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const socketRef = useRef<ReturnType<typeof getSocket>>();

  // Collaboration state (solo by default)
  const [collab, setCollab] = useState(false);
  const [collabCode, setCollabCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const listenersAttachedRef = useRef(false);
  const pruneRef = useRef<number | null>(null);

  // Attach socket listeners once when collaboration is first used
  const setupSocketListeners = () => {
    if (listenersAttachedRef.current) return;
    const socket = getSocket(SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      // connected
    });

    // Helpful diagnostics
    socket.on('connect_error', (err: any) => {
      console.error('[socket] connect_error', err?.message || err);
    });
    socket.on('error', (err: any) => {
      console.error('[socket] error', err);
    });
    socket.on('reconnect_error', (err: any) => {
      console.error('[socket] reconnect_error', err?.message || err);
    });

    socket.on('init', (payload: { elements: Element[] }) => {
      setElements(payload.elements || []);
    });

    socket.on('draw:stroke', (stroke: Element) => {
      setElements((prev: Element[]) => {
        if (stroke.type !== 'stroke') return prev;
        const idx = prev.findIndex((e) => e.id === stroke.id);
        if (idx === -1) {
          return [...prev, stroke];
        }
        const current = prev[idx];
        if (current.type === 'stroke') {
          const merged = {
            ...current,
            points: [...(current.points || []), ...((stroke as any).points || [])],
          } as Element;
          const copy = prev.slice();
          copy[idx] = merged;
          return copy;
        }
        return prev;
      });
    });

    socket.on('draw:element', (el: Element) => {
      setElements((prev) => [...prev, el]);
    });

    socket.on('board:reset', () => {
      setElements([]);
    });

    socket.on('cursor:move', (c: RemoteCursor) => {
      setCursors((prev: Record<string, RemoteCursor>) => ({
        ...prev,
        [c.id]: { ...c, lastSeen: Date.now() },
      }));
    });

    if (!pruneRef.current) {
      pruneRef.current = window.setInterval(() => {
        setCursors((prev: Record<string, RemoteCursor>) => {
          const out: typeof prev = {};
          const now = Date.now();
          for (const [id, c] of Object.entries(prev)) {
            if (now - c.lastSeen < 5000) out[id] = c;
          }
          return out;
        });
      }, 2000);
    }

    listenersAttachedRef.current = true;
  };

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (pruneRef.current) {
        clearInterval(pruneRef.current);
        pruneRef.current = null;
      }
      const socket = socketRef.current as any;
      if (socket) {
        socket.removeAllListeners?.();
        socket.disconnect?.();
      }
      listenersAttachedRef.current = false;
    };
  }, []);

  const emitStroke = (stroke: Element) => {
    if (collab) {
      socketRef.current?.emit('draw:stroke', stroke);
    } else {
      // Local merge when in solo mode
      setElements((prev: Element[]) => {
        if (stroke.type !== 'stroke') return prev;
        const idx = prev.findIndex((e) => e.id === stroke.id);
        if (idx === -1) return [...prev, stroke];
        const current = prev[idx];
        if (current.type === 'stroke') {
          const merged = {
            ...current,
            points: [...(current.points || []), ...((stroke as any).points || [])],
          } as Element;
          const copy = prev.slice();
          copy[idx] = merged;
          return copy;
        }
        return prev;
      });
    }
  };
  const emitElement = (el: Element) => {
    if (collab) {
      socketRef.current?.emit('draw:element', el);
    } else {
      setElements((prev) => [...prev, el]);
    }
  };
  const emitCursor = (x: number, y: number) => {
    if (collab) socketRef.current?.emit('cursor:move', { x, y, name, color: myColor });
  };

  const stageRef = useRef<any>(null);
  const onExportPNG = async () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl: string = stage.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'collabboard.png';
    a.click();
  };

  const onReset = async () => {
    if (!collab) {
      // Solo mode: reset local board only
      setElements([]);
      return;
    }
    if (!RESET_TOKEN) {
      alert('No RESET token configured on the client. Set VITE_RESET_TOKEN for the web app.');
      return;
    }
    try {
      await fetch(`${SERVER_URL}/reset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESET_TOKEN}` },
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Collaboration actions
  const enableCollabAndJoin = (code: string) => {
    setupSocketListeners();
    const socket = socketRef.current as any;
    socket?.emit('room:join', { code }, (resp: any) => {
      if (!resp?.ok) {
        alert(resp?.error || 'Failed to join collaboration');
        setCollab(false);
        return;
      }
      setCollab(true);
      setCollabCode((prev) => prev ?? code);
      setCodeExpiresAt(resp.expiresAt ?? null);
    });
  };

  const onStartCollab = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/collab/create`, { method: 'POST' });
      const data = await res.json();
      if (!data?.ok) throw new Error('Failed to create code');
      setCollabCode(data.code);
      setCodeExpiresAt(data.expiresAt ?? null);
      enableCollabAndJoin(data.code);
    } catch (e) {
      alert('Could not start collaboration');
      console.error(e);
    }
  };

  const onJoinWithCode = () => {
    const code = joinCode.trim();
    if (!/^[0-9]{6}$/.test(code)) {
      alert('Please enter a valid 6-digit code');
      return;
    }
    enableCollabAndJoin(code);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/10 bg-[#1e1e1e]/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="font-semibold text-lg">Collaborative Whiteboard</div>
          <div className="text-sm opacity-75">You are {name}</div>
          <div className="ml-auto flex items-center gap-2">
            {collab ? (
              <div className="text-sm px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10">
                Collaborating • Code {collabCode ?? '—'}
              </div>
            ) : (
              <>
                <button
                  onClick={onStartCollab}
                  className="px-3 py-1 rounded border text-sm bg-blue-600/20 border-blue-500/40 hover:bg-blue-600/30"
                >
                  Start collaboration
                </button>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  placeholder="Enter code"
                  className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-sm"
                />
                <button
                  onClick={onJoinWithCode}
                  className="px-3 py-1 rounded border text-sm bg-slate-800 border-slate-700 hover:bg-slate-700"
                >
                  Join
                </button>
              </>
            )}
          </div>
          <Toolbar
            tool={tool}
            setTool={setTool}
            color={color}
            setColor={setColor}
            width={width}
            setWidth={setWidth}
            onExportPNG={onExportPNG}
            onReset={onReset}
          />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Board
          elements={elements}
          setElements={setElements}
          tool={tool}
          color={color}
          width={width}
          name={name}
          myColor={myColor}
          cursors={cursors}
          emitStroke={emitStroke}
          emitElement={emitElement}
          emitCursor={emitCursor}
          onStageReady={(st) => (stageRef.current = st)}
        />
      </main>
      <footer className="text-center text-xs text-slate-300 py-2 border-t border-white/10 bg-[#1e1e1e]">
        Collaborative Whiteboard – Embedded Real-Time Whiteboard Demo
      </footer>
    </div>
  );
}

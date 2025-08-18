import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tool } from '../types';

type Props = {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  width: number;
  setWidth: (w: number) => void;
  onExportPNG: () => void;
  onReset: () => void;
};

 export default function Toolbar({ tool, setTool, color, setColor, width, setWidth, onExportPNG, onReset }: Props) {
   // Dropdown state
   const [openTools, setOpenTools] = useState(false);
   const [openColors, setOpenColors] = useState(false);

   // Button/menu anchors and fixed-position dropdown placement
   const toolsBtnRef = useRef<HTMLButtonElement | null>(null);
   const colorsBtnRef = useRef<HTMLButtonElement | null>(null);
   const toolMenuRef = useRef<HTMLDivElement | null>(null);
   const colorMenuRef = useRef<HTMLDivElement | null>(null);
   const [toolPos, setToolPos] = useState<{ left: number; top: number } | null>(null);
   const [colorPos, setColorPos] = useState<{ left: number; top: number } | null>(null);

   const updatePositions = () => {
     if (openTools && toolsBtnRef.current) {
       const r = toolsBtnRef.current.getBoundingClientRect();
       setToolPos({ left: r.left, top: r.bottom + 4 });
     }
     if (openColors && colorsBtnRef.current) {
       const r = colorsBtnRef.current.getBoundingClientRect();
       setColorPos({ left: r.left, top: r.bottom + 4 });
     }
   };
   useEffect(() => {
     updatePositions();
   }, [openTools, openColors]);
   useEffect(() => {
     const onScrollOrResize = () => updatePositions();
     window.addEventListener('scroll', onScrollOrResize, true);
     window.addEventListener('resize', onScrollOrResize);
     return () => {
       window.removeEventListener('scroll', onScrollOrResize, true);
       window.removeEventListener('resize', onScrollOrResize);
     };
   }, []);

   // Outside click handling
   useEffect(() => {
     const onDocClick = (e: MouseEvent) => {
       const t = e.target as Node;
       const toolInsideParent = toolsBtnRef.current?.contains(t) ?? false;
       const colorInsideParent = colorsBtnRef.current?.contains(t) ?? false;
       const toolInsideMenu = toolMenuRef.current?.contains(t) ?? false;
       const colorInsideMenu = colorMenuRef.current?.contains(t) ?? false;
       if (openTools && !(toolInsideParent || toolInsideMenu)) setOpenTools(false);
       if (openColors && !(colorInsideParent || colorInsideMenu)) setOpenColors(false);
     };
     document.addEventListener('mousedown', onDocClick);
     return () => document.removeEventListener('mousedown', onDocClick);
   }, [openTools, openColors]);

   // Tool list
   const toolDefs: { id: Tool; label: string; icon: React.ReactNode }[] = [
     {
       id: 'pen',
       label: 'Pen',
       icon: (
         <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
           <path d="M12 19l7-7 2 2-7 7H7v-7l7-7 2 2-7 7" />
         </svg>
       ),
     },
     {
       id: 'rect',
       label: 'Rectangle',
       icon: (
         <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
           <rect x="4" y="6" width="16" height="12" rx="1" />
         </svg>
       ),
     },
     {
       id: 'circle',
       label: 'Circle',
       icon: (
         <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
           <circle cx="12" cy="12" r="6" />
         </svg>
       ),
     },
     {
       id: 'line',
       label: 'Line',
       icon: (
         <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
           <path d="M4 18L18 4" />
         </svg>
       ),
     },
     {
       id: 'text',
       label: 'Text',
       icon: (
         <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
           <path d="M5 7V5h14v2M12 19V6" />
         </svg>
       ),
     },
   ];

   const currentTool = toolDefs.find((t) => t.id === tool) || toolDefs[0];
  
  // Color helpers (hex <-> rgb)
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '').trim();
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(full || '000000', 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };
  const rgbToHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((v) => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');

  const [rgb, setRgb] = useState(() => hexToRgb(color));
  useEffect(() => {
    // Sync external color changes
    setRgb(hexToRgb(color));
  }, [color]);

  // Common palette
  const palette = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#84cc16', '#ffffff', '#111827'];

  return (
    <>
      <div className="ml-2 flex items-center gap-2">
        {/* Tools, color, width */}
        <div className="flex items-center gap-1">
          <button
            ref={toolsBtnRef}
            onClick={() => {
              setOpenTools((v) => !v);
              setOpenColors(false);
            }}
            aria-haspopup="menu"
            aria-expanded={openTools}
            className="px-2 py-1 rounded border text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 inline-flex items-center gap-1"
            title="Select tool"
          >
            <span className="shrink-0">{currentTool.icon}</span>
            <span className="hidden sm:inline">{currentTool.label}</span>
            <svg viewBox="0 0 20 20" className="h-3 w-3 opacity-70" fill="currentColor">
              <path d="M5.5 7.5l4.5 4.5 4.5-4.5z" />
            </svg>
          </button>

          <button
            ref={colorsBtnRef}
            onClick={() => {
              setOpenColors((v) => !v);
              setOpenTools(false);
            }}
            aria-haspopup="menu"
            aria-expanded={openColors}
            className="px-1 py-1 rounded border bg-slate-800 border-slate-700 hover:bg-slate-700 inline-flex items-center"
            title="Stroke color"
          >
            <span
              className="w-5 h-5 rounded-sm border border-white/20"
              style={{ backgroundColor: color }}
            />
          </button>

          <div className="hidden sm:flex items-center gap-1">
            <span className="text-xs opacity-70">Width</span>
            <input
              type="range"
              min={1}
              max={16}
              step={1}
              value={width}
              onChange={(e) => setWidth(parseInt((e.target as HTMLInputElement).value))}
              className="w-28 h-2"
            />
          </div>
        </div>

        {/* Actions - compact for iframe */}
        <div className="ml-2 flex items-center gap-1">
          <button
            onClick={onExportPNG}
            className="h-8 w-8 sm:w-auto sm:px-2 sm:py-1 rounded border text-xs bg-emerald-600/20 border-emerald-500/40 hover:bg-emerald-600/30 flex items-center justify-center gap-1"
            title="Export PNG"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16v-8M8 12h8M4 20h16a1 1 0 001-1v-8a1 1 0 00-1-1h-3l-2-3h-6l-2 3H4a1 1 0 00-1 1v8a1 1 0 001 1z"/></svg>
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={onReset}
            className="h-8 w-8 sm:w-auto sm:px-2 sm:py-1 rounded border text-xs bg-rose-600/20 border-rose-500/40 hover:bg-rose-600/30 flex items-center justify-center gap-1"
            title="Reset board"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-2M4 16a8 8 0 0014 2"/></svg>
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Portaled dropdowns */}
      {openTools && toolPos && createPortal(
        <div
          ref={toolMenuRef}
          style={{ position: 'fixed', left: toolPos.left, top: toolPos.top }}
          className="z-[1000] bg-[#1e1e1e] border border-white/10 rounded shadow-lg p-1"
        >
          {toolDefs.map((td) => (
            <button
              key={td.id}
              onClick={() => {
                setTool(td.id);
                setOpenTools(false);
              }}
              className={`w-full text-left flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700 ${tool === td.id ? 'bg-slate-700' : ''}`}
            >
              <span className="shrink-0">{td.icon}</span>
              <span className="text-xs">{td.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}

      {openColors && colorPos && createPortal(
        <div
          ref={colorMenuRef}
          style={{ position: 'fixed', left: colorPos.left, top: colorPos.top }}
          className="z-[1000] bg-[#1e1e1e] border border-white/10 rounded shadow-lg"
        >
          <div className="grid grid-cols-5 gap-1 p-2">
            {palette.map((hex) => (
              <button
                key={hex}
                onClick={() => {
                  setColor(hex);
                  setRgb(hexToRgb(hex));
                  setOpenColors(false);
                }}
                className="w-6 h-6 rounded border border-white/10"
                style={{ backgroundColor: hex }}
                title={hex}
              />
            ))}
          </div>
          <div className="p-2 border-t border-white/10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs">R</span>
              <input
                type="range" min={0} max={255}
                value={rgb.r}
                onChange={(e) => {
                  const r = parseInt((e.target as HTMLInputElement).value);
                  const next = { ...rgb, r };
                  setRgb(next);
                  setColor(rgbToHex(next.r, next.g, next.b));
                }}
                className="flex-1"
              />
              <input
                type="number" min={0} max={255}
                value={rgb.r}
                onChange={(e) => {
                  const r = parseInt(e.target.value || '0');
                  const next = { ...rgb, r: clamp(r, 0, 255) };
                  setRgb(next);
                  setColor(rgbToHex(next.r, next.g, next.b));
                }}
                className="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs">G</span>
              <input
                type="range" min={0} max={255}
                value={rgb.g}
                onChange={(e) => {
                  const g = parseInt((e.target as HTMLInputElement).value);
                  const next = { ...rgb, g };
                  setRgb(next);
                  setColor(rgbToHex(next.r, next.g, next.b));
                }}
                className="flex-1"
              />
              <input
                type="number" min={0} max={255}
                value={rgb.g}
                onChange={(e) => {
                  const g = parseInt(e.target.value || '0');
                  const next = { ...rgb, g: clamp(g, 0, 255) };
                  setRgb(next);
                  setColor(rgbToHex(next.r, next.g, next.b));
                }}
                className="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs">B</span>
              <input
                type="range" min={0} max={255}
                value={rgb.b}
                onChange={(e) => {
                  const b = parseInt((e.target as HTMLInputElement).value);
                  const next = { ...rgb, b };
                  setRgb(next);
                  setColor(rgbToHex(next.r, next.g, next.b));
                }}
                className="flex-1"
              />
              <input
                type="number" min={0} max={255}
                value={rgb.b}
                onChange={(e) => {
                  const b = parseInt(e.target.value || '0');
                  const next = { ...rgb, b: clamp(b, 0, 255) };
                  setRgb(next);
                  setColor(rgbToHex(next.r, next.g, next.b));
                }}
                className="w-14 px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="w-6 h-6 rounded border border-white/10" style={{ backgroundColor: rgbToHex(rgb.r, rgb.g, rgb.b) }} />
              <div className="text-xs font-mono">{rgbToHex(rgb.r, rgb.g, rgb.b)}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

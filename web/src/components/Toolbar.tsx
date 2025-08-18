import React, { useEffect, useRef, useState } from 'react';
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
   // Dropdown state and outside click handling
   const [openTools, setOpenTools] = useState(false);
   const [openColors, setOpenColors] = useState(false);
   const toolsRef = useRef<HTMLDivElement | null>(null);
   const colorsRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
     const onDocClick = (e: MouseEvent) => {
       const t = e.target as Node;
       if (openTools && toolsRef.current && !toolsRef.current.contains(t)) setOpenTools(false);
       if (openColors && colorsRef.current && !colorsRef.current.contains(t)) setOpenColors(false);
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

   const applyRgb = (nr: number, ng: number, nb: number) => {
     const hex = rgbToHex(nr, ng, nb);
     setRgb({ r: nr, g: ng, b: nb });
     setColor(hex);
   };

   return (
     <div className="flex items-center gap-2 text-xs">
       {/* Tool dropdown */}
       <div className="relative" ref={toolsRef}>
         <button
           onClick={() => setOpenTools((v) => !v)}
           className="h-8 px-2 rounded border bg-slate-900 border-slate-800 hover:bg-slate-800 flex items-center gap-2"
           title="Drawing tool"
         >
           <span className="inline-flex items-center gap-1">
             <span className="text-slate-200">{currentTool.icon}</span>
             <span className="hidden sm:inline">{currentTool.label}</span>
           </span>
           <svg viewBox="0 0 20 20" className="h-3 w-3 opacity-70" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.186l3.71-3.955a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"/></svg>
         </button>
         {openTools && (
           <div className="absolute z-20 mt-1 w-40 rounded border border-slate-800 bg-slate-900 shadow-lg p-1">
             {toolDefs.map((t) => (
               <button
                 key={t.id}
                 onClick={() => {
                   setTool(t.id);
                   setOpenTools(false);
                 }}
                 className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left ${tool === t.id ? 'bg-slate-800' : 'hover:bg-slate-800/60'}`}
               >
                 <span className="text-slate-200">{t.icon}</span>
                 <span>{t.label}</span>
               </button>
             ))}
           </div>
         )}
       </div>

       {/* Color dropdown (custom) */}
       <div className="relative" ref={colorsRef}>
         <button
           onClick={() => setOpenColors((v) => !v)}
           className="h-8 px-2 rounded border bg-slate-900 border-slate-800 hover:bg-slate-800 flex items-center gap-2"
           title="Stroke color"
         >
           <span className="h-4 w-4 rounded border border-slate-700" style={{ backgroundColor: color }} />
           <span className="hidden sm:inline">Color</span>
           <svg viewBox="0 0 20 20" className="h-3 w-3 opacity-70" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.186l3.71-3.955a.75.75 0 111.08 1.04l-4.24 4.52a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"/></svg>
         </button>
         {openColors && (
           <div className="absolute z-20 mt-1 w-60 rounded border border-slate-800 bg-slate-900 shadow-lg p-2">
             <div className="mb-2">
               <div className="grid grid-cols-10 gap-1">
                 {palette.map((p) => (
                   <button
                     key={p}
                     className="h-6 w-6 rounded border border-slate-700"
                     style={{ backgroundColor: p }}
                     onClick={() => {
                       setColor(p);
                       setRgb(hexToRgb(p));
                     }}
                     title={p}
                   />
                 ))}
               </div>
             </div>
             <div className="space-y-1">
               <div className="flex items-center gap-2">
                 <span className="w-6 text-[10px] opacity-70">R</span>
                 <input
                   type="range"
                   min={0}
                   max={255}
                   value={rgb.r}
                   onChange={(e) => applyRgb(parseInt(e.target.value), rgb.g, rgb.b)}
                   className="flex-1"
                 />
                 <span className="w-8 text-right tabular-nums">{rgb.r}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-6 text-[10px] opacity-70">G</span>
                 <input
                   type="range"
                   min={0}
                   max={255}
                   value={rgb.g}
                   onChange={(e) => applyRgb(rgb.r, parseInt(e.target.value), rgb.b)}
                   className="flex-1"
                 />
                 <span className="w-8 text-right tabular-nums">{rgb.g}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="w-6 text-[10px] opacity-70">B</span>
                 <input
                   type="range"
                   min={0}
                   max={255}
                   value={rgb.b}
                   onChange={(e) => applyRgb(rgb.r, rgb.g, parseInt(e.target.value))}
                   className="flex-1"
                 />
                 <span className="w-8 text-right tabular-nums">{rgb.b}</span>
               </div>
             </div>
             <div className="mt-2 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <span className="h-4 w-4 rounded border border-slate-700" style={{ backgroundColor: color }} />
                 <code className="text-[11px] opacity-80">{color.toUpperCase()}</code>
               </div>
               <button
                 onClick={() => setOpenColors(false)}
                 className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-800 text-[11px]"
               >
                 Done
               </button>
             </div>
           </div>
         )}
       </div>

       {/* Width slider */}
       <div className="hidden sm:flex items-center gap-2 pl-1">
         <label className="text-[11px] opacity-75">Width</label>
         <input
           type="range"
           min={1}
           max={16}
           step={1}
           value={width}
           onChange={(e) => setWidth(parseInt(e.target.value))}
         />
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
   );
 }

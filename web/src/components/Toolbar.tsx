import React from 'react';
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
  const Btn = ({ id, label }: { id: Tool; label: string }) => (
    <button
      onClick={() => setTool(id)}
      className={`px-3 py-1 rounded border text-sm ${tool === id ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2">
      <Btn id="pen" label="Pen" />
      <Btn id="rect" label="Rect" />
      <Btn id="circle" label="Circle" />
      <Btn id="line" label="Line" />
      <Btn id="text" label="Text" />

      <div className="flex items-center gap-2 pl-2">
        <label className="text-xs opacity-75">Color</label>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 bg-transparent" />
      </div>

      <div className="flex items-center gap-2 pl-2">
        <label className="text-xs opacity-75">Width</label>
        <input
          type="range"
          min={1}
          max={16}
          step={1}
          value={width}
          onChange={(e) => setWidth(parseInt(e.target.value))}
        />
      </div>

      <div className="ml-4 flex items-center gap-2">
        <button onClick={onExportPNG} className="px-3 py-1 rounded border text-sm bg-emerald-600/20 border-emerald-500/40 hover:bg-emerald-600/30">Export PNG</button>
        <button onClick={onReset} className="px-3 py-1 rounded border text-sm bg-rose-600/20 border-rose-500/40 hover:bg-rose-600/30">Reset Board</button>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Line as KLine, Rect as KRect, Circle as KCircle, Text as KText } from 'react-konva';
import type { CircleEl, Element, LineEl, RectEl, RemoteCursor, Stroke, TextEl, Tool } from '../types';

function uid(prefix = 'el') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Props = {
  elements: Element[];
  setElements: React.Dispatch<React.SetStateAction<Element[]>>;
  tool: Tool;
  color: string;
  width: number;
  name: string;
  myColor: string;
  cursors: Record<string, RemoteCursor>;
  emitStroke: (stroke: Element) => void;
  emitElement: (el: Element) => void;
  emitCursor: (x: number, y: number) => void;
  onStageReady?: (stage: any) => void;
};

export default function Board({
  elements,
  setElements,
  tool,
  color,
  width,
  name,
  myColor,
  cursors,
  emitStroke,
  emitElement,
  emitCursor,
  onStageReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  // Draft drawings for optimistic rendering
  const [draftStroke, setDraftStroke] = useState<Stroke | null>(null);
  const [draftShape, setDraftShape] = useState<RectEl | CircleEl | LineEl | null>(null);

  const drawingRef = useRef(false);
  const strokeIdRef = useRef<string | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Resize observer to fit container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Helpers to get pointer pos within stage
  const getPos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const p = stage.getPointerPosition();
    return { x: p?.x || 0, y: p?.y || 0 };
  };

  const onMouseDown = () => {
    const { x, y } = getPos();
    if (tool === 'pen') {
      drawingRef.current = true;
      strokeIdRef.current = uid('stroke');
      const s: Stroke = {
        id: strokeIdRef.current,
        type: 'stroke',
        color,
        width,
        points: [x, y],
      };
      setDraftStroke(s);
      // Send initial point
      emitStroke(s);
    } else if (tool === 'rect' || tool === 'circle' || tool === 'line') {
      startRef.current = { x, y };
      setDraftShape(null);
    } else if (tool === 'text') {
      const txt = window.prompt('Enter text');
      if (txt && txt.trim().length) {
        const el: TextEl = {
          id: uid('text'),
          type: 'text',
          x,
          y,
          text: txt.trim(),
          color,
          fontSize: clamp(8 + width * 2, 10, 64),
        };
        emitElement(el);
      }
    }
  };

  const onMouseMove = () => {
    const { x, y } = getPos();
    emitCursor(x, y);

    if (tool === 'pen' && drawingRef.current && draftStroke) {
      const update: Stroke = {
        ...draftStroke,
        points: [x, y], // send incremental points; server will append
      };
      setDraftStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, x, y] } : { ...update, points: [x, y] }
      );
      emitStroke(update);
    } else if ((tool === 'rect' || tool === 'circle' || tool === 'line') && startRef.current) {
      const { x: sx, y: sy } = startRef.current;
      if (tool === 'rect') {
        const el: RectEl = {
          id: 'draft-rect',
          type: 'rect',
          x: Math.min(sx, x),
          y: Math.min(sy, y),
          width: Math.abs(x - sx),
          height: Math.abs(y - sy),
          strokeColor: color,
          strokeWidth: width,
        };
        setDraftShape(el);
      } else if (tool === 'circle') {
        const dx = x - sx;
        const dy = y - sy;
        const r = Math.sqrt(dx * dx + dy * dy);
        const el: CircleEl = {
          id: 'draft-circle',
          type: 'circle',
          x: sx,
          y: sy,
          radius: r,
          strokeColor: color,
          strokeWidth: width,
        };
        setDraftShape(el);
      } else if (tool === 'line') {
        const el: LineEl = {
          id: 'draft-line',
          type: 'line',
          x1: sx,
          y1: sy,
          x2: x,
          y2: y,
          strokeColor: color,
          strokeWidth: width,
        };
        setDraftShape(el);
      }
    }
  };

  const onMouseUp = () => {
    if (tool === 'pen') {
      drawingRef.current = false;
      strokeIdRef.current = null;
      setDraftStroke(null);
    } else if ((tool === 'rect' || tool === 'circle' || tool === 'line') && startRef.current) {
      const { x, y } = getPos();
      const { x: sx, y: sy } = startRef.current;
      startRef.current = null;
      let final: RectEl | CircleEl | LineEl | null = null;
      if (tool === 'rect') {
        final = {
          id: uid('rect'),
          type: 'rect',
          x: Math.min(sx, x),
          y: Math.min(sy, y),
          width: Math.abs(x - sx),
          height: Math.abs(y - sy),
          strokeColor: color,
          strokeWidth: width,
        };
      } else if (tool === 'circle') {
        const dx = x - sx;
        const dy = y - sy;
        final = {
          id: uid('circle'),
          type: 'circle',
          x: sx,
          y: sy,
          radius: Math.sqrt(dx * dx + dy * dy),
          strokeColor: color,
          strokeWidth: width,
        };
      } else if (tool === 'line') {
        final = {
          id: uid('line'),
          type: 'line',
          x1: sx,
          y1: sy,
          x2: x,
          y2: y,
          strokeColor: color,
          strokeWidth: width,
        };
      }
      if (final) emitElement(final);
      setDraftShape(null);
    }
  };

  // Compose all items to render: server elements + drafts on top
  const rendered = useMemo(() => elements, [elements]);

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-116px)] bg-white">
      <Stage
        ref={(node: any) => {
          stageRef.current = node;
          onStageReady?.(node);
        }}
        width={size.w}
        height={size.h}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onMouseDown}
        onTouchMove={onMouseMove}
        onTouchEnd={onMouseUp}
      >
        <Layer listening>
          {rendered.map((el) => {
            if (el.type === 'stroke') {
              const s = el as Stroke;
              return (
                <KLine
                  key={s.id}
                  points={s.points}
                  stroke={s.color}
                  strokeWidth={s.width}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            }
            if (el.type === 'rect') {
              const r = el as RectEl;
              return (
                <KRect
                  key={r.id}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  stroke={r.strokeColor}
                  strokeWidth={r.strokeWidth}
                />
              );
            }
            if (el.type === 'circle') {
              const c = el as CircleEl;
              return (
                <KCircle
                  key={c.id}
                  x={c.x}
                  y={c.y}
                  radius={c.radius}
                  stroke={c.strokeColor}
                  strokeWidth={c.strokeWidth}
                />
              );
            }
            if (el.type === 'line') {
              const l = el as LineEl;
              return (
                <KLine
                  key={l.id}
                  points={[l.x1, l.y1, l.x2, l.y2]}
                  stroke={l.strokeColor}
                  strokeWidth={l.strokeWidth}
                  lineCap="round"
                />
              );
            }
            if (el.type === 'text') {
              const t = el as TextEl;
              return (
                <KText key={t.id} x={t.x} y={t.y} text={t.text} fill={t.color} fontSize={t.fontSize} />
              );
            }
            return null;
          })}

          {draftStroke && (
            <KLine
              points={draftStroke.points}
              stroke={draftStroke.color}
              strokeWidth={draftStroke.width}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {draftShape && draftShape.type === 'rect' && (
            <KRect
              x={draftShape.x}
              y={draftShape.y}
              width={draftShape.width}
              height={draftShape.height}
              stroke={draftShape.strokeColor}
              strokeWidth={draftShape.strokeWidth}
              dash={[4, 4]}
            />
          )}
          {draftShape && draftShape.type === 'circle' && (
            <KCircle
              x={draftShape.x}
              y={draftShape.y}
              radius={(draftShape as any).radius}
              stroke={draftShape.strokeColor}
              strokeWidth={draftShape.strokeWidth}
              dash={[4, 4]}
            />
          )}
          {draftShape && draftShape.type === 'line' && (
            <KLine
              points={[(draftShape as any).x1, (draftShape as any).y1, (draftShape as any).x2, (draftShape as any).y2]}
              stroke={draftShape.strokeColor}
              strokeWidth={draftShape.strokeWidth}
              dash={[4, 4]}
            />
          )}
        </Layer>

        <Layer listening={false}>
          {/* Remote cursors */}
          {Object.entries(cursors).map(([id, c]) => (
            <React.Fragment key={id}>
              <KCircle x={c.x} y={c.y} radius={4} fill={c.color} />
              <KText x={c.x + 6} y={c.y - 6} text={c.name} fill={c.color} fontSize={12} />
            </React.Fragment>
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

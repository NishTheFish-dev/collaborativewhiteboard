export type Tool = 'pen' | 'rect' | 'circle' | 'line' | 'text';

export type Stroke = {
  id: string;
  type: 'stroke';
  color: string;
  width: number;
  points: number[]; // [x1,y1,x2,y2,...]
};

export type RectEl = {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
};

export type CircleEl = {
  id: string;
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
};

export type LineEl = {
  id: string;
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
};

export type TextEl = {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
};

export type Element = Stroke | RectEl | CircleEl | LineEl | TextEl;

export type RemoteCursor = {
  id: string;
  x: number;
  y: number;
  name: string;
  color: string;
  lastSeen: number;
};

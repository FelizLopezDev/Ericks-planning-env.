import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Avatar pixel art del asistente (mago aprendiz).
 * Todo el dibujo vive en BASE + PALETTE: para cambiar el personaje
 * solo hay que editar esas dos constantes, el resto de la app no cambia.
 *
 * Uso: <AssistantAvatar size="md" state="thinking" />
 */
export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarState = 'idle' | 'thinking' | 'speaking' | 'error';

// Cuadrícula 16x16. '.' = transparente. Cada letra es un color de PALETTE.
const BASE = [
  ".......HH.......",
  "......HhhH......",
  "......HhYH......",
  ".....HhhhhH.....",
  "..HHHHHHHHHHHH..",
  "....SSSSSSSS....",
  "....SESSSSES....",
  "....SESSSSES....",
  "....SSSMMSSS....",
  "....BBBBBBBB....",
  "...RRBBbbBBRR...",
  "..SRRRBBBBRRRS..",
  "...RRRRRRRRRR...",
  "...rRRWWWWRRr...",
  "..rrRRRRRRRRrr..",
  "..KKKK....KKKK..",
];

const PALETTE: Record<string, string> = {
  H: '#2b4a9a',
  h: '#4a74da',
  Y: '#f4c542',
  S: '#f2c29b',
  E: '#1b1b24',
  M: '#b5654a',
  B: '#e5e7eb',
  b: '#a1a1aa',
  R: '#3f68c9',
  r: '#2b4a9a',
  W: '#a0642d',
  K: '#5b3a1e',
  A: '#f59e0b',
  Q: '#fde68a',
};

type Edit = [row: number, col: number, ch: string];

const SIZES: Record<AvatarSize, number> = { sm: 24, md: 40, lg: 96 };

const EYES_OPEN_DOWN: Edit[] = [[6,5,'S'],[7,5,'E'],[6,10,'S'],[7,10,'E']];
const BLINK: Edit[] = [[6,5,'S'],[7,5,'E'],[6,10,'S'],[7,10,'E']];
const NO_MOUTH: Edit[] = [[8,7,'S'],[8,8,'S']];

function framesFor(state: AvatarState, tick: number): Edit[] {
  switch (state) {
    case 'thinking': {
      const dots: Edit[] = [[1,11,'Y'],[1,13,'Y'],[1,15,'Y']].slice(0, (tick % 4)) as Edit[];
      return [...EYES_OPEN_DOWN, ...NO_MOUTH, ...dots];
    }
    case 'speaking':
      return tick % 2 === 0 ? [[8,7,'E'],[8,8,'E']] : [];
    case 'error': {
      const amber: Edit[] = [];
      BASE.forEach((row, y) => [...row].forEach((c, x) => {
        if (c === 'H') amber.push([y, x, 'A']);
        if (c === 'h') amber.push([y, x, 'Q']);
      }));
      return [...amber, [8,6,'M'],[8,7,'M'],[8,8,'M'],[8,9,'M'],[0,14,'A'],[1,14,'A'],[3,14,'A']];
    }
    default:
      return tick % 10 === 9 ? BLINK : []; // parpadeo ocasional
  }
}

export function AssistantAvatar({
  size = 'md',
  state = 'idle',
  className = '',
}: {
  size?: AvatarSize;
  state?: AvatarState;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduce || state === 'error') return;
    const ms = state === 'speaking' ? 220 : state === 'thinking' ? 420 : 400;
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [state, reduce]);

  const rects = useMemo(() => {
    const grid = BASE.map((r) => [...r]);
    for (const [y, x, c] of framesFor(state, reduce ? 0 : tick)) grid[y][x] = c;
    const out: { x: number; y: number; w: number; fill: string }[] = [];
    grid.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const c = row[x];
        if (c === '.') { x++; continue; }
        let w = 1;
        while (x + w < row.length && row[x + w] === c) w++;
        out.push({ x, y, w, fill: PALETTE[c] });
        x += w;
      }
    });
    return out;
  }, [state, tick, reduce]);

  const px = SIZES[size];
  return (
    <svg
      viewBox="0 0 16 16"
      width={px}
      height={px}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Asistente"
      className={`shrink-0 ${className}`}
      style={{ imageRendering: 'pixelated' }}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}

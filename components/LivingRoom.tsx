'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { THEME } from '@/lib/constants';
import type {
  RoomState,
  Appearance,
  RoomLayout,
} from '@/types/app';
import { Character, type ReactionType } from './Character';
import { useWeather, type TimeOfDay, type Weather } from '@/hooks/useWeather';

// ============================================================
// Isometric living room — Animal Crossing Happy Home Designer flavor.
//
// World coords: (x, z) on the floor (each unit = ~28 SVG px), y vertical.
// 2:1 dimetric projection (commonly called "isometric" in game dev) using
//   sx = (x - z) * COS  +  CX
//   sy = (x + z) * SIN  -  y  +  CY
// We tilt the camera ~30° (cos 0.866 / sin 0.500) for the classic look.
//
// Floor goes from world (0,0) at the back-left corner to (12,12) at the
// front-right. Back wall sits at z=0. Left wall sits at x=0.
// ============================================================

interface LivingRoomProps {
  state: RoomState;
  appearance?: Appearance;
  layout?: RoomLayout;
  weather?: Weather;
  timeOfDay?: TimeOfDay;
  /** Disable all motion (used by previews/tests). */
  reduced?: boolean;
  onCharacterTap?: () => void;
}

const REACTIONS: ReactionType[] = ['wave', 'jump', 'dance', 'shy', 'bow'];

const COS = 0.8660254;     // cos(30°)
const SIN = 0.5;           // sin(30°)
const CX = 240;            // viewBox center x
const CY = 230;            // shift up a bit so the floor sits in the lower 2/3
const UNIT = 28;           // 1 world unit = 28 svg px

/** Convert world coords (units) → svg coords (px). */
function iso(wx: number, wz: number, wy = 0) {
  const x = wx * UNIT;
  const z = wz * UNIT;
  const y = wy * UNIT;
  return {
    x: (x - z) * COS + CX,
    y: (x + z) * SIN - y + CY,
  };
}

/** Build an SVG `points` string from a list of (wx, wz, wy) world points. */
function isoPoly(...pts: Array<[number, number, number?]>) {
  return pts
    .map(([wx, wz, wy = 0]) => {
      const p = iso(wx, wz, wy);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

const SKY_BY_TIME: Record<TimeOfDay, [string, string]> = {
  morning:   ['#FFE4B5', '#FFB877'],
  afternoon: ['#BCE3E8', '#88BBD8'],
  evening:   ['#FF9A55', '#C0532B'],
  night:     ['#1F3055', '#0E1A33'],
};

// Wall + floor palette per state.
const PALETTE: Record<
  RoomState,
  {
    backWall: [string, string];
    leftWall: [string, string];
    floorPlankA: string;
    floorPlankB: string;
    floorLine: string;
    grout: string;
  }
> = {
  clean: {
    backWall:   ['#FFF1DC', '#F4DEB7'],
    leftWall:   ['#F5DEB7', '#E5C593'],
    floorPlankA: '#E8C49A',
    floorPlankB: '#D9AE7E',
    floorLine:   '#B58356',
    grout:       '#C99B6F',
  },
  ok: {
    backWall:   ['#F4E0BD', '#E2C794'],
    leftWall:   ['#E2C794', '#C9A871'],
    floorPlankA: '#D9AE7E',
    floorPlankB: '#C99B6F',
    floorLine:   '#9B6C44',
    grout:       '#B0855B',
  },
  dirty: {
    backWall:   ['#9B8466', '#74624C'],
    leftWall:   ['#7B6850', '#52432F'],
    floorPlankA: '#7E6648',
    floorPlankB: '#65512F',
    floorLine:   '#3F2E1B',
    grout:       '#574429',
  },
  critical: {
    backWall:   ['#3F352A', '#2A2018'],
    leftWall:   ['#2D2519', '#181109'],
    floorPlankA: '#3A2D1E',
    floorPlankB: '#2A2014',
    floorLine:   '#16100A',
    grout:       '#221912',
  },
};

export function LivingRoom({
  state,
  appearance,
  layout,
  weather: weatherProp,
  timeOfDay: timeProp,
  reduced = false,
  onCharacterTap,
}: LivingRoomProps) {
  const auto = useWeather();
  const weather: Weather = weatherProp ?? auto.weather;
  const timeOfDay: TimeOfDay = timeProp ?? auto.timeOfDay;

  const t = THEME[state];
  const pal = PALETTE[state];
  const isCritical = state === 'critical';
  const isDirty = state === 'dirty' || isCritical;

  // Random reaction when the user taps the character
  const [reaction, setReaction] = useState<ReactionType | null>(null);
  const reactionTimer = useRef<number | null>(null);
  const handleCharacterTap = () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    setReaction(r);
    reactionTimer.current = window.setTimeout(() => setReaction(null), 1600);
    onCharacterTap?.();
  };
  useEffect(() => () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
  }, []);

  // Wall clock — current time
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [reduced]);
  const hourDeg = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
  const minDeg = now.getMinutes() * 6;

  // Layout selections (with sensible defaults)
  const plantA = layout?.plants?.[0] ?? 'monstera';
  const plantB = layout?.plants?.[1] ?? 'cactus';
  const sofaVariant = layout?.sofa ?? 'small';
  const rugVariant = layout?.rug ?? 'round';
  const tableVariant = layout?.table ?? 'round';
  const bookshelfVariant = layout?.bookshelf ?? 'rect';
  const extras = layout?.extras ?? [];

  // Mood ping (soft pulse on the floor near character)
  const showMood = isDirty;

  // ──────────────────────────────────────────────────────────────────────
  // Pre-computed geometry for floor + walls (12 × 12 floor, height 8)
  // ──────────────────────────────────────────────────────────────────────
  const ROOM_W = 12;          // floor width  (x axis)
  const ROOM_D = 12;          // floor depth  (z axis)
  const WALL_H = 8;           // wall height  (y axis)

  // Floor diamond (4 corners, y=0)
  const floorPoints = isoPoly(
    [0, 0],
    [ROOM_W, 0],
    [ROOM_W, ROOM_D],
    [0, ROOM_D],
  );

  // Back wall: x = 0..W, z = 0, y = 0..H  (we draw from back-left to back-right)
  const backWallPoints = isoPoly(
    [0, 0, 0],
    [ROOM_W, 0, 0],
    [ROOM_W, 0, WALL_H],
    [0, 0, WALL_H],
  );

  // Left wall: x = 0, z = 0..D
  const leftWallPoints = isoPoly(
    [0, 0, 0],
    [0, 0, WALL_H],
    [0, ROOM_D, WALL_H],
    [0, ROOM_D, 0],
  );

  // Floor grid plank lines (axis-aligned in world space)
  const floorLines: Array<[string, string]> = [];
  for (let i = 1; i < ROOM_W; i++) {
    const a = iso(i, 0);
    const b = iso(i, ROOM_D);
    floorLines.push([`${a.x},${a.y}`, `${b.x},${b.y}`]);
  }
  for (let j = 1; j < ROOM_D; j++) {
    const a = iso(0, j);
    const b = iso(ROOM_W, j);
    floorLines.push([`${a.x},${a.y}`, `${b.x},${b.y}`]);
  }

  return (
    <div className="cm-room w-full max-w-[480px] mx-auto select-none">
      <svg
        viewBox="0 0 480 480"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto"
        role="img"
        aria-label={`Living room — state: ${state}`}
      >
        <defs>
          {/* Soft drop shadow for furniture */}
          <filter id="iso-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0" dy="2" result="off" />
            <feComponentTransfer><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Window sky gradient */}
          <linearGradient id="iso-sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={SKY_BY_TIME[timeOfDay][0]} />
            <stop offset="100%" stopColor={SKY_BY_TIME[timeOfDay][1]} />
          </linearGradient>
          {/* Sun / moon */}
          <radialGradient id="iso-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFBE6" />
            <stop offset="100%" stopColor={timeOfDay === 'night' ? '#E8E8FA' : '#FFE08A'} />
          </radialGradient>
          {/* Wall and floor gradients */}
          <linearGradient id="iso-back-wall" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={pal.backWall[0]} />
            <stop offset="100%" stopColor={pal.backWall[1]} />
          </linearGradient>
          <linearGradient id="iso-left-wall" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={pal.leftWall[0]} />
            <stop offset="100%" stopColor={pal.leftWall[1]} />
          </linearGradient>
          {/* Warm ceiling light — used at night */}
          <radialGradient id="iso-ceiling-glow" cx="50%" cy="0%" r="80%">
            <stop offset="0%" stopColor="#FFE9A8" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#FFD478" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFD478" stopOpacity="0" />
          </radialGradient>
          {/* Daylight beam — used when sunny + day */}
          <linearGradient id="iso-sun-beam" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFF6C8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFF6C8" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Outer page gradient (sky behind window peeks through walls; here just a neutral pad) */}
        <rect width="480" height="480" fill="transparent" />

        {/* ───── BACK WALL ───── */}
        <polygon points={backWallPoints} fill="url(#iso-back-wall)" />
        {/* Back wall horizontal trim */}
        <line
          x1={iso(0, 0, 0.4).x} y1={iso(0, 0, 0.4).y}
          x2={iso(ROOM_W, 0, 0.4).x} y2={iso(ROOM_W, 0, 0.4).y}
          stroke={pal.floorLine} strokeWidth="0.5" opacity="0.6"
        />

        {/* ───── LEFT WALL ───── */}
        <polygon points={leftWallPoints} fill="url(#iso-left-wall)" />
        <line
          x1={iso(0, 0, 0.4).x} y1={iso(0, 0, 0.4).y}
          x2={iso(0, ROOM_D, 0.4).x} y2={iso(0, ROOM_D, 0.4).y}
          stroke={pal.floorLine} strokeWidth="0.5" opacity="0.6"
        />

        {/* ───── BACK WALL DECOR ───── */}
        {/* Big 4-pane window centered on back wall */}
        <BackWallWindow timeOfDay={timeOfDay} weather={weather} reduced={reduced} />

        {/* Picture frame (back wall, right side) */}
        <BackWallFrame state={state} />

        {/* ───── LEFT WALL DECOR ───── */}
        {/* Wall clock */}
        <LeftWallClock hourDeg={hourDeg} minDeg={minDeg} state={state} />
        {/* Sunflower picture frame */}
        <LeftWallFrame state={state} />

        {/* ───── FLOOR ───── */}
        <polygon points={floorPoints} fill={pal.floorPlankA} />
        {/* Plank stripes (alternating) — thicker bands every 2 units along x */}
        {Array.from({ length: ROOM_W / 2 }).map((_, i) => {
          const x0 = i * 2;
          const x1 = x0 + 1;
          const pts = isoPoly([x0, 0], [x1, 0], [x1, ROOM_D], [x0, ROOM_D]);
          return <polygon key={`band-${i}`} points={pts} fill={pal.floorPlankB} opacity="0.55" />;
        })}
        {/* Plank seam lines */}
        <g stroke={pal.grout} strokeWidth="0.5" opacity="0.45">
          {floorLines.map(([from, to], i) => {
            const [x1, y1] = from.split(',');
            const [x2, y2] = to.split(',');
            return <line key={`fl-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        {/* Floor outline (a touch darker for definition) */}
        <polygon points={floorPoints} fill="none" stroke={pal.floorLine} strokeWidth="1" opacity="0.45" />

        {/* ───── FURNITURE ───── */}
        {/* Sort by depth: items further back (lower x+z) drawn first */}
        {/* Bookshelf — back wall, left side, against z=0 */}
        <Bookshelf wx={1.2} wz={0.6} state={state} variant={bookshelfVariant} />

        {/* TV cabinet — back wall, right of center */}
        <TvCabinet wx={6.0} wz={0.7} state={state} />

        {/* Wall extras — drawn flat on back wall */}
        {extras.includes('whiteboard') && <Whiteboard state={state} />}
        {extras.includes('calendar') && <Calendar state={state} />}

        {/* Bean bag — right side mid (only when sofa is NOT beanbag, otherwise replaces sofa) */}
        {sofaVariant !== 'beanbag' && (
          <BeanBag wx={9.5} wz={3.5} accent={t.accent} state={state} />
        )}

        {/* Plant A — back-right corner */}
        <Plant wx={10.5} wz={1.0} variant={plantA} state={state} />

        {/* Rug — under sofa area */}
        {rugVariant === 'square' ? (
          <SquareRug wx={5.5} wz={6.5} accent={t.accent} state={state} />
        ) : rugVariant === 'nordic' ? (
          <NordicRug wx={5.5} wz={6.5} accent={t.accent} state={state} />
        ) : (
          <RoundRug wx={5.5} wz={6.5} accent={t.accent} state={state} />
        )}

        {/* Sofa — center-front, facing camera */}
        {sofaVariant === 'beanbag' ? (
          <BeanBag wx={4.5} wz={7} accent={t.accent} state={state} large />
        ) : (
          <Sofa wx={sofaVariant === 'large' ? 2.8 : 3.5} wz={6.5} accent={t.accent} state={state} variant={sofaVariant} />
        )}

        {/* Side table with mug — left of sofa */}
        <SideTable wx={1.5} wz={6.0} state={state} variant={tableVariant} />

        {/* Floor extras */}
        {extras.includes('fishbowl') && <Fishbowl wx={9.6} wz={6.2} state={state} />}
        {extras.includes('catbed') && <CatBed wx={8.4} wz={9.2} accent={t.accent} state={state} />}
        {extras.includes('console') && <Console wx={6.5} wz={2.1} state={state} />}

        {/* Plant B (small cactus) — front-left corner on floor */}
        <Plant wx={0.7} wz={10.5} variant={plantB} state={state} small />

        {/* ───── DAYLIGHT FLOOR BEAM (sunny + morning/afternoon/evening) ─────
             A trapezoid of warm light cast from the back-wall window onto the floor. */}
        {(weather === 'sunny' || timeOfDay === 'morning' || timeOfDay === 'evening') &&
         timeOfDay !== 'night' && (
          <polygon
            points={isoPoly(
              [3.5, 0.1],
              [8.5, 0.1],
              [9.5, 6],
              [2.5, 6],
            )}
            fill="url(#iso-sun-beam)"
            opacity={timeOfDay === 'evening' ? 0.7 : 0.55}
            pointerEvents="none"
          />
        )}

        {/* ───── CEILING GLOW (night) ─────
             A soft warm pendant-light spilling from the ceiling area. */}
        {timeOfDay === 'night' && (
          <ellipse
            cx={iso(6, 5, 7).x}
            cy={iso(6, 5, 7).y}
            rx="200" ry="120"
            fill="url(#iso-ceiling-glow)"
            pointerEvents="none"
          />
        )}

        {/* ───── FLOOR DUST (dirty/critical) ───── */}
        {isDirty && <DustBunnies isCritical={isCritical} />}

        {/* ───── CHARACTER ───── */}
        {/* Center-front area, slightly forward */}
        <g transform={`translate(${iso(6, 8).x - 240}, ${iso(6, 8).y - 320})`}>
          <Character
            state={state}
            appearance={appearance}
            reaction={reaction}
            onTap={handleCharacterTap}
            reduced={reduced}
            scale={1.05}
          />
        </g>

        {/* Mood ping bubble */}
        {showMood && (
          <g transform={`translate(${iso(6, 7).x}, ${iso(6, 7).y - 80})`} className="cm-mood-bubble">
            <ellipse cx="0" cy="0" rx="22" ry="14" fill="#FFFBF5" opacity="0.9" />
            <text x="0" y="5" textAnchor="middle" fontSize="14">
              {isCritical ? '😫' : '😟'}
            </text>
          </g>
        )}

        {/* Cobwebs (critical only) — back-left and back-right corners */}
        {isCritical && <Cobwebs />}

        {/* Subtle ambient sparkles on clean state */}
        {state === 'clean' && !reduced && <Sparkles />}

        <style>{`
          .cm-mood-bubble { animation: cm-bub 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes cm-bub { 0%,100% { transform: translateY(0); opacity: 0.85; } 50% { transform: translateY(-3px); opacity: 1; } }
          .cm-spark { animation: cm-spk 4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes cm-spk { 0%,100% { opacity: 0; transform: scale(0.6); } 50% { opacity: 0.85; transform: scale(1); } }
          .cm-rain-drop { animation: cm-rain 1.2s linear infinite; }
          @keyframes cm-rain { 0% { transform: translateY(-6px); opacity: 0; } 30% { opacity: 0.8; } 100% { transform: translateY(28px); opacity: 0; } }

          .cm-snow-flake { animation: cm-snow 4.5s linear infinite; }
          @keyframes cm-snow {
            0%   { transform: translateY(-4px) translateX(0); opacity: 0; }
            15%  { opacity: 0.95; }
            100% { transform: translateY(110px) translateX(8px); opacity: 0; }
          }

          .cm-star { animation: cm-star 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes cm-star {
            0%, 100% { opacity: 0.3; transform: scale(0.85); }
            50%      { opacity: 1;   transform: scale(1.15); }
          }

          .cm-cloud { animation: cm-cloud-drift 28s linear infinite; }
          @keyframes cm-cloud-drift {
            0%   { transform: translateX(-4px); }
            50%  { transform: translateX(4px); }
            100% { transform: translateX(-4px); }
          }

          .cm-bird { animation: cm-bird-fly 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes cm-bird-fly {
            0%   { transform: translate(0, 0); opacity: 0.6; }
            50%  { transform: translate(20px, -6px); opacity: 0.9; }
            100% { transform: translate(40px, 0); opacity: 0; }
          }

          .cm-sun-rays { animation: cm-rays 6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
          @keyframes cm-rays {
            0%, 100% { opacity: 0.45; }
            50%      { opacity: 0.75; }
          }

          @media (prefers-reduced-motion: reduce) {
            .cm-snow-flake, .cm-star, .cm-cloud, .cm-bird, .cm-sun-rays, .cm-rain-drop { animation: none !important; }
          }
        `}</style>
      </svg>
    </div>
  );
}

// ============================================================
// Sub-components — each takes world coords (wx, wz) and renders an
// isometric chunk anchored at its base.
// ============================================================

function Sofa({
  wx,
  wz,
  accent,
  state,
  variant = 'small',
}: {
  wx: number;
  wz: number;
  accent: string;
  state: RoomState;
  variant?: 'small' | 'large';
}) {
  // Small: 3 wide × 1.4 deep / Large: 4.4 wide × 1.6 deep, taller back
  const isLarge = variant === 'large';
  const W = isLarge ? 4.4 : 3;
  const D = isLarge ? 1.6 : 1.4;
  const BACK_H = isLarge ? 1.05 : 0.9;
  const SEAT_H = isLarge ? 0.55 : 0.5;
  const cushionCount = isLarge ? 3 : 2;
  const dim = state === 'critical' ? 0.7 : state === 'dirty' ? 0.85 : 1;
  const tone = state === 'clean' ? 1.05 : 1;

  const lighten = (c: string, p: number) => c; // keep simple — we use accent + shade in fills
  const back = withShade(accent, -0.15 * (1 / tone));
  const seat = accent;
  const base = withShade(accent, -0.30);

  // Top of back (rear)
  const backTop = isoPoly(
    [wx, wz, BACK_H],
    [wx + W, wz, BACK_H],
    [wx + W, wz + 0.25, BACK_H],
    [wx, wz + 0.25, BACK_H],
  );
  // Back front face
  const backFront = isoPoly(
    [wx, wz + 0.25, 0],
    [wx + W, wz + 0.25, 0],
    [wx + W, wz + 0.25, BACK_H],
    [wx, wz + 0.25, BACK_H],
  );
  // Seat top
  const seatTop = isoPoly(
    [wx, wz + 0.25, SEAT_H],
    [wx + W, wz + 0.25, SEAT_H],
    [wx + W, wz + D, SEAT_H],
    [wx, wz + D, SEAT_H],
  );
  // Seat front face
  const seatFront = isoPoly(
    [wx, wz + D, 0],
    [wx + W, wz + D, 0],
    [wx + W, wz + D, SEAT_H],
    [wx, wz + D, SEAT_H],
  );
  // Right side (visible side)
  const seatRight = isoPoly(
    [wx + W, wz + 0.25, 0],
    [wx + W, wz + D, 0],
    [wx + W, wz + D, SEAT_H],
    [wx + W, wz + 0.25, SEAT_H],
  );

  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      {/* base shadow on floor */}
      <ellipse
        cx={iso(wx + W / 2, wz + D / 2).x}
        cy={iso(wx + W / 2, wz + D / 2).y + 4}
        rx="42" ry="9"
        fill="rgba(0,0,0,0.18)"
      />
      <polygon points={seatRight} fill={base} />
      <polygon points={seatFront} fill={withShade(accent, -0.18)} />
      <polygon points={seatTop} fill={seat} />
      <polygon points={backFront} fill={back} />
      <polygon points={backTop} fill={withShade(accent, +0.05)} />

      {/* Cushions */}
      {Array.from({ length: cushionCount }).map((_, i) => {
        const cushionW = (W - 0.6) / cushionCount - 0.1;
        const cx = wx + 0.3 + i * ((W - 0.6) / cushionCount);
        const cz = wz + 0.5;
        const ch = SEAT_H + 0.18;
        const top = isoPoly(
          [cx, cz, ch],
          [cx + cushionW, cz, ch],
          [cx + cushionW, cz + (D - 0.7), ch],
          [cx, cz + (D - 0.7), ch],
        );
        const front = isoPoly(
          [cx, cz + (D - 0.7), SEAT_H],
          [cx + cushionW, cz + (D - 0.7), SEAT_H],
          [cx + cushionW, cz + (D - 0.7), ch],
          [cx, cz + (D - 0.7), ch],
        );
        return (
          <g key={i}>
            <polygon points={front} fill={withShade(accent, +0.05)} />
            <polygon points={top} fill={withShade(accent, +0.18)} />
          </g>
        );
      })}
    </g>
  );
}

function RoundRug({ wx, wz, accent, state }: { wx: number; wz: number; accent: string; state: RoomState }) {
  const center = iso(wx, wz);
  const rx = 4 * UNIT * COS;
  const ry = 4 * UNIT * SIN;
  const dim = state === 'critical' ? 0.5 : state === 'dirty' ? 0.75 : 1;
  return (
    <g opacity={dim}>
      <ellipse cx={center.x} cy={center.y} rx={rx} ry={ry} fill={withShade(accent, -0.10)} opacity="0.45" />
      <ellipse cx={center.x} cy={center.y} rx={rx * 0.78} ry={ry * 0.78} fill={withShade(accent, +0.10)} opacity="0.55" />
      <ellipse cx={center.x} cy={center.y} rx={rx * 0.5} ry={ry * 0.5} fill="#FFFBF5" opacity="0.45" />
    </g>
  );
}

function SideTable({
  wx,
  wz,
  state,
  variant = 'square',
}: {
  wx: number;
  wz: number;
  state: RoomState;
  variant?: 'round' | 'square' | 'low';
}) {
  const dim = state === 'critical' ? 0.7 : 1;
  const H = variant === 'low' ? 0.35 : 0.6;
  const W = variant === 'low' ? 1.6 : 1.2;
  const D = variant === 'low' ? 1.6 : 1.2;

  // Round table: cylindrical leg + ellipse top
  if (variant === 'round') {
    const cx = wx + W / 2, cz = wz + D / 2;
    const topC = iso(cx, cz, H);
    const baseC = iso(cx, cz, 0);
    const rxTop = (W / 2) * UNIT * COS;
    const ryTop = (W / 2) * UNIT * SIN;
    return (
      <g filter="url(#iso-shadow)" opacity={dim}>
        {/* Pedestal leg */}
        <rect
          x={topC.x - 4} y={topC.y}
          width="8" height={baseC.y - topC.y}
          fill="#7B5436"
        />
        {/* Base disc */}
        <ellipse cx={baseC.x} cy={baseC.y} rx={rxTop * 0.55} ry={ryTop * 0.55} fill="#5C3F22" />
        {/* Top disc */}
        <ellipse cx={topC.x} cy={topC.y} rx={rxTop} ry={ryTop} fill="#A37148" />
        <ellipse cx={topC.x} cy={topC.y - 1.5} rx={rxTop * 0.95} ry={ryTop * 0.95} fill="#B98859" />
        <Mug wx={cx} wz={cz} y={H} state={state} />
      </g>
    );
  }

  // Common box top/front/right
  const top = isoPoly(
    [wx, wz, H], [wx + W, wz, H], [wx + W, wz + D, H], [wx, wz + D, H],
  );
  const front = isoPoly(
    [wx, wz + D, 0], [wx + W, wz + D, 0], [wx + W, wz + D, H], [wx, wz + D, H],
  );
  const right = isoPoly(
    [wx + W, wz, 0], [wx + W, wz + D, 0], [wx + W, wz + D, H], [wx + W, wz, H],
  );

  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <polygon points={right} fill="#7B5436" />
      <polygon points={front} fill="#8B5E3C" />
      <polygon points={top} fill="#A37148" />
      {/* Low coffee table: lighter wood + magazine on top */}
      {variant === 'low' && (
        <g>
          <rect
            x={iso(wx + 0.3, wz + 0.4, H).x - 8}
            y={iso(wx + 0.3, wz + 0.4, H).y - 2}
            width="14" height="3"
            fill="#C46E52" rx="0.5"
          />
          <rect
            x={iso(wx + 0.3, wz + 0.4, H).x - 8}
            y={iso(wx + 0.3, wz + 0.4, H).y + 2}
            width="14" height="3"
            fill="#5C8A6B" rx="0.5"
          />
        </g>
      )}
      <Mug wx={wx + W / 2} wz={wz + D / 2} y={H} state={state} />
    </g>
  );
}

function Mug({ wx, wz, y, state }: { wx: number; wz: number; y: number; state: RoomState }) {
  const c = iso(wx, wz, y);
  return (
    <g>
      <ellipse cx={c.x} cy={c.y - 6} rx="6" ry="2.5" fill="#FFFBF5" />
      <rect x={c.x - 6} y={c.y - 14} width="12" height="10" rx="2" fill="#FFFBF5" stroke="#C99B6F" strokeWidth="0.6" />
      <ellipse cx={c.x} cy={c.y - 14} rx="6" ry="2.2" fill="#C28E4E" opacity="0.85" />
      {/* Handle */}
      <path d={`M ${c.x + 6} ${c.y - 12} q 4 1 0 6`} fill="none" stroke="#FFFBF5" strokeWidth="2" />
      {/* Steam (only when not dirty) */}
      {state !== 'dirty' && state !== 'critical' && (
        <g opacity="0.6">
          <path d={`M ${c.x - 2} ${c.y - 18} q 2 -3 0 -6 q -2 -3 0 -6`} fill="none" stroke="#FFFBF5" strokeWidth="1.4" strokeLinecap="round">
            <animate attributeName="opacity" from="0.2" to="0.7" dur="2.2s" repeatCount="indefinite" />
          </path>
        </g>
      )}
    </g>
  );
}

function Bookshelf({
  wx,
  wz,
  state,
  variant = 'rect',
}: {
  wx: number;
  wz: number;
  state: RoomState;
  variant?: 'rect' | 'l-shape';
}) {
  const W = 2.0, D = 0.6, H = 4.5;
  const dim = state === 'critical' ? 0.65 : state === 'dirty' ? 0.85 : 1;
  const front = isoPoly(
    [wx, wz + D, 0],
    [wx + W, wz + D, 0],
    [wx + W, wz + D, H],
    [wx, wz + D, H],
  );
  const right = isoPoly(
    [wx + W, wz, 0],
    [wx + W, wz + D, 0],
    [wx + W, wz + D, H],
    [wx + W, wz, H],
  );
  const top = isoPoly(
    [wx, wz, H],
    [wx + W, wz, H],
    [wx + W, wz + D, H],
    [wx, wz + D, H],
  );
  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <polygon points={right} fill="#6B4624" />
      <polygon points={front} fill="#8B5E3C" />
      <polygon points={top} fill="#A37148" />
      {/* Shelves and books — 4 shelves */}
      {[1, 2, 3, 4].map((i) => {
        const sy = (H / 4.5) * i;
        // Shelf line
        const a = iso(wx, wz + D, sy);
        const b = iso(wx + W, wz + D, sy);
        return <line key={`sh-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3F2718" strokeWidth="1" />;
      })}
      {/* Books */}
      {[0, 1, 2, 3].map((shelf) => {
        const colors = ['#C46E52', '#5C8A6B', '#D4A04A', '#7C6BAA', '#E89B6B', '#88BBD8'];
        return (
          <g key={`books-${shelf}`}>
            {colors.slice(0, 5 + (shelf % 2)).map((cc, i) => {
              const bx = wx + 0.18 + i * 0.34;
              const by = 0.4 + shelf * 1.0;
              const bh = 0.7 + (i % 2) * 0.15;
              const top = isoPoly(
                [bx, wz + D - 0.1, by + bh],
                [bx + 0.28, wz + D - 0.1, by + bh],
                [bx + 0.28, wz + D, by + bh],
                [bx, wz + D, by + bh],
              );
              const face = isoPoly(
                [bx, wz + D, by],
                [bx + 0.28, wz + D, by],
                [bx + 0.28, wz + D, by + bh],
                [bx, wz + D, by + bh],
              );
              return (
                <g key={`b-${shelf}-${i}`}>
                  <polygon points={face} fill={cc} />
                  <polygon points={top} fill={withShade(cc, +0.15)} />
                </g>
              );
            })}
          </g>
        );
      })}
      {/* L-shape side wing — extending forward (along z) at the right edge of main shelf */}
      {variant === 'l-shape' && (() => {
        const wW = 0.6, wD = 1.6, wH = 2.6;
        const wx0 = wx + W - wW;
        const wz0 = wz + D;
        const wFront = isoPoly(
          [wx0, wz0 + wD, 0],
          [wx0 + wW, wz0 + wD, 0],
          [wx0 + wW, wz0 + wD, wH],
          [wx0, wz0 + wD, wH],
        );
        const wRight = isoPoly(
          [wx0 + wW, wz0, 0],
          [wx0 + wW, wz0 + wD, 0],
          [wx0 + wW, wz0 + wD, wH],
          [wx0 + wW, wz0, wH],
        );
        const wTop = isoPoly(
          [wx0, wz0, wH],
          [wx0 + wW, wz0, wH],
          [wx0 + wW, wz0 + wD, wH],
          [wx0, wz0 + wD, wH],
        );
        return (
          <g>
            <polygon points={wRight} fill="#6B4624" />
            <polygon points={wFront} fill="#8B5E3C" />
            <polygon points={wTop} fill="#A37148" />
            {/* Decor on top — small green plant */}
            <ellipse
              cx={iso(wx0 + wW / 2, wz0 + wD / 2, wH).x}
              cy={iso(wx0 + wW / 2, wz0 + wD / 2, wH).y - 6}
              rx="6" ry="4" fill="#5C8A6B"
            />
            <rect
              x={iso(wx0 + wW / 2, wz0 + wD / 2, wH).x - 3}
              y={iso(wx0 + wW / 2, wz0 + wD / 2, wH).y - 2}
              width="6" height="4"
              fill="#9B6440"
            />
          </g>
        );
      })()}
    </g>
  );
}

function TvCabinet({ wx, wz, state }: { wx: number; wz: number; state: RoomState }) {
  const W = 3.0, D = 0.9, H = 1.4;
  const dim = state === 'critical' ? 0.7 : 1;
  const front = isoPoly([wx, wz + D, 0], [wx + W, wz + D, 0], [wx + W, wz + D, H], [wx, wz + D, H]);
  const right = isoPoly([wx + W, wz, 0], [wx + W, wz + D, 0], [wx + W, wz + D, H], [wx + W, wz, H]);
  const top = isoPoly([wx, wz, H], [wx + W, wz, H], [wx + W, wz + D, H], [wx, wz + D, H]);

  // TV on top
  const tvW = 2.2, tvD = 0.2, tvH = 1.4;
  const tvCx = wx + (W - tvW) / 2;
  const tvCz = wz + 0.15;
  const tvFront = isoPoly(
    [tvCx, tvCz + tvD, H],
    [tvCx + tvW, tvCz + tvD, H],
    [tvCx + tvW, tvCz + tvD, H + tvH],
    [tvCx, tvCz + tvD, H + tvH],
  );
  const tvBack = isoPoly(
    [tvCx, tvCz, H],
    [tvCx + tvW, tvCz, H],
    [tvCx + tvW, tvCz, H + tvH],
    [tvCx, tvCz, H + tvH],
  );

  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <polygon points={right} fill="#6B4624" />
      <polygon points={front} fill="#8B5E3C" />
      <polygon points={top} fill="#A37148" />
      {/* Cabinet doors */}
      <line x1={iso(wx + W / 2, wz + D, 0).x} y1={iso(wx + W / 2, wz + D, 0).y}
            x2={iso(wx + W / 2, wz + D, H).x} y2={iso(wx + W / 2, wz + D, H).y}
            stroke="#3F2718" strokeWidth="1.2" />
      {/* TV body */}
      <polygon points={tvBack} fill="#1F1F1F" />
      <polygon points={tvFront} fill={state === 'clean' ? '#5C8A8C' : state === 'critical' ? '#0F0F0F' : '#28333C'} />
      {/* Glow */}
      {state === 'clean' && (
        <polygon points={tvFront} fill="#A8DADC" opacity="0.25" />
      )}
    </g>
  );
}

function BeanBag({
  wx,
  wz,
  accent,
  state,
  large = false,
}: {
  wx: number;
  wz: number;
  accent: string;
  state: RoomState;
  large?: boolean;
}) {
  const c = iso(wx, wz);
  const dim = state === 'critical' ? 0.7 : 1;
  const s = large ? 1.6 : 1;
  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <ellipse cx={c.x} cy={c.y + 8 * s} rx={36 * s} ry={10 * s} fill="rgba(0,0,0,0.15)" />
      <ellipse cx={c.x} cy={c.y - 4 * s} rx={34 * s} ry={20 * s} fill={withShade(accent, -0.15)} />
      <ellipse cx={c.x} cy={c.y - 8 * s} rx={28 * s} ry={14 * s} fill={withShade(accent, +0.1)} />
      <ellipse cx={c.x - 6 * s} cy={c.y - 12 * s} rx={6 * s} ry={3 * s} fill="#FFFBF5" opacity="0.4" />
    </g>
  );
}

function Plant({
  wx,
  wz,
  variant,
  state,
  small = false,
}: {
  wx: number;
  wz: number;
  variant: string;
  state: RoomState;
  small?: boolean;
}) {
  const dim = state === 'critical' ? 0.65 : 1;
  const wilted = state === 'critical';
  const scale = small ? 0.7 : 1;
  // Pot
  const PW = 0.9 * scale, PD = 0.9 * scale, PH = 0.7 * scale;
  const potTop = isoPoly(
    [wx, wz, PH],
    [wx + PW, wz, PH],
    [wx + PW, wz + PD, PH],
    [wx, wz + PD, PH],
  );
  const potFront = isoPoly(
    [wx, wz + PD, 0],
    [wx + PW, wz + PD, 0],
    [wx + PW, wz + PD, PH],
    [wx, wz + PD, PH],
  );
  const potRight = isoPoly(
    [wx + PW, wz, 0],
    [wx + PW, wz + PD, 0],
    [wx + PW, wz + PD, PH],
    [wx + PW, wz, PH],
  );

  // Foliage anchor on top of pot
  const top = iso(wx + PW / 2, wz + PD / 2, PH);
  const leafColor = wilted ? '#6B6242' : '#5C8A6B';
  const leafLight = wilted ? '#9A8E63' : '#88BB8E';

  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <polygon points={potRight} fill="#9B6440" />
      <polygon points={potFront} fill="#B57848" />
      <polygon points={potTop} fill="#D89868" />
      {/* Foliage — varies by variant */}
      {variant === 'cactus' && (
        <>
          <rect
            x={top.x - 6 * scale} y={top.y - 28 * scale}
            width={12 * scale} height={26 * scale} rx={6 * scale}
            fill={leafColor}
          />
          {!wilted && (
            <>
              <circle cx={top.x - 7 * scale} cy={top.y - 12 * scale} r={2} fill="#FFFBF5" opacity="0.6" />
              <circle cx={top.x + 7 * scale} cy={top.y - 18 * scale} r={2} fill="#FFFBF5" opacity="0.6" />
            </>
          )}
        </>
      )}
      {variant === 'monstera' && (
        <>
          <ellipse cx={top.x - 7 * scale} cy={top.y - 18 * scale} rx={10 * scale} ry={14 * scale} fill={leafColor} transform={`rotate(-20 ${top.x - 7 * scale} ${top.y - 18 * scale})`} />
          <ellipse cx={top.x + 7 * scale} cy={top.y - 22 * scale} rx={10 * scale} ry={14 * scale} fill={leafLight} transform={`rotate(20 ${top.x + 7 * scale} ${top.y - 22 * scale})`} />
          <ellipse cx={top.x} cy={top.y - 30 * scale} rx={9 * scale} ry={13 * scale} fill={leafColor} />
          {/* Monstera fenestrations (slits) */}
          {!wilted && (
            <>
              <line x1={top.x - 7 * scale} y1={top.y - 22 * scale} x2={top.x - 4 * scale} y2={top.y - 18 * scale} stroke="#3F5A47" strokeWidth="1" />
              <line x1={top.x + 7 * scale} y1={top.y - 26 * scale} x2={top.x + 4 * scale} y2={top.y - 22 * scale} stroke="#3F5A47" strokeWidth="1" />
            </>
          )}
        </>
      )}
      {variant === 'succulent' && (
        // Cluster of small rosette pads
        <g>
          {[
            { dx: 0, dy: -8, r: 6 },
            { dx: -7, dy: -4, r: 4 },
            { dx: 7, dy: -5, r: 4.5 },
            { dx: -3, dy: -12, r: 3.5 },
            { dx: 4, dy: -13, r: 3 },
          ].map((p, i) => (
            <g key={i}>
              <ellipse
                cx={top.x + p.dx * scale} cy={top.y + p.dy * scale}
                rx={p.r * scale} ry={p.r * 0.7 * scale}
                fill={i % 2 === 0 ? leafLight : leafColor}
              />
              {!wilted && (
                <circle cx={top.x + p.dx * scale} cy={top.y + p.dy * scale} r={p.r * 0.35 * scale} fill={withShade(leafLight, +0.15)} opacity="0.7" />
              )}
            </g>
          ))}
        </g>
      )}
      {variant === 'tree' && (
        // Slim trunk + canopy + 3 cherry blossoms
        <g>
          <rect
            x={top.x - 1.4 * scale} y={top.y - 30 * scale}
            width={2.8 * scale} height={26 * scale}
            fill="#7B5436"
          />
          <ellipse cx={top.x} cy={top.y - 36 * scale} rx={14 * scale} ry={11 * scale} fill={wilted ? '#7A6240' : '#88BB8E'} />
          <ellipse cx={top.x - 6 * scale} cy={top.y - 32 * scale} rx={9 * scale} ry={8 * scale} fill={wilted ? '#7A6240' : '#5C8A6B'} />
          <ellipse cx={top.x + 6 * scale} cy={top.y - 32 * scale} rx={9 * scale} ry={8 * scale} fill={wilted ? '#7A6240' : '#5C8A6B'} />
          {!wilted && (
            <>
              <circle cx={top.x - 5 * scale} cy={top.y - 38 * scale} r={1.6 * scale} fill="#F4B6C8" />
              <circle cx={top.x + 4 * scale} cy={top.y - 36 * scale} r={1.4 * scale} fill="#F4B6C8" />
              <circle cx={top.x + 1 * scale} cy={top.y - 42 * scale} r={1.6 * scale} fill="#F4B6C8" />
            </>
          )}
        </g>
      )}
      {variant === 'herb' && (
        // Bushy multi-stem herb (basil-style) with small leaves
        <g>
          {[-5, 0, 5].map((dx, i) => (
            <g key={i}>
              <line
                x1={top.x + dx * scale} y1={top.y}
                x2={top.x + dx * scale * 1.4} y2={top.y - 16 * scale}
                stroke={wilted ? '#7A6240' : '#5C8A6B'} strokeWidth={1.4}
              />
              <ellipse
                cx={top.x + dx * scale * 1.4} cy={top.y - 18 * scale}
                rx={4 * scale} ry={3 * scale}
                fill={wilted ? '#8A7654' : '#88BB8E'}
              />
              <ellipse
                cx={top.x + dx * scale * 1.4 - 2 * scale} cy={top.y - 12 * scale}
                rx={3 * scale} ry={2.2 * scale}
                fill={wilted ? '#7A6240' : '#5C8A6B'}
              />
              <ellipse
                cx={top.x + dx * scale * 1.4 + 2 * scale} cy={top.y - 13 * scale}
                rx={2.8 * scale} ry={2 * scale}
                fill={wilted ? '#7A6240' : '#5C8A6B'}
              />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

function SquareRug({
  wx,
  wz,
  accent,
  state,
}: {
  wx: number;
  wz: number;
  accent: string;
  state: RoomState;
}) {
  // Rug centered at (wx, wz), 5x4 footprint
  const W = 5, D = 4;
  const x0 = wx - W / 2, z0 = wz - D / 2;
  const dim = state === 'critical' ? 0.5 : state === 'dirty' ? 0.75 : 1;
  const outer = isoPoly([x0, z0], [x0 + W, z0], [x0 + W, z0 + D], [x0, z0 + D]);
  const inner = isoPoly(
    [x0 + 0.4, z0 + 0.4],
    [x0 + W - 0.4, z0 + 0.4],
    [x0 + W - 0.4, z0 + D - 0.4],
    [x0 + 0.4, z0 + D - 0.4],
  );
  return (
    <g opacity={dim}>
      <polygon points={outer} fill={withShade(accent, -0.10)} opacity="0.55" />
      <polygon points={inner} fill={withShade(accent, +0.12)} opacity="0.7" />
      {/* Diagonal accent stripes */}
      {[0, 1, 2].map((i) => {
        const t = (i + 1) / 4;
        const a = iso(x0 + W * t, z0 + 0.4);
        const b = iso(x0 + W * t, z0 + D - 0.4);
        return (
          <line
            key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={withShade(accent, -0.20)} strokeWidth="1.2" opacity="0.5"
          />
        );
      })}
    </g>
  );
}

function NordicRug({
  wx,
  wz,
  accent,
  state,
}: {
  wx: number;
  wz: number;
  accent: string;
  state: RoomState;
}) {
  // Cream rug with chevron / triangular pattern
  const W = 5.2, D = 4.2;
  const x0 = wx - W / 2, z0 = wz - D / 2;
  const dim = state === 'critical' ? 0.5 : state === 'dirty' ? 0.75 : 1;
  const outer = isoPoly([x0, z0], [x0 + W, z0], [x0 + W, z0 + D], [x0, z0 + D]);
  // Triangle band
  const tri1 = isoPoly([x0 + 0.6, z0 + 0.6], [x0 + 1.4, z0 + 0.6], [x0 + 1.0, z0 + 1.4]);
  const tri2 = isoPoly([x0 + 1.6, z0 + 0.6], [x0 + 2.4, z0 + 0.6], [x0 + 2.0, z0 + 1.4]);
  const tri3 = isoPoly([x0 + 2.6, z0 + 0.6], [x0 + 3.4, z0 + 0.6], [x0 + 3.0, z0 + 1.4]);
  const tri4 = isoPoly([x0 + 3.6, z0 + 0.6], [x0 + 4.4, z0 + 0.6], [x0 + 4.0, z0 + 1.4]);
  // Bottom band stripe
  const stripeA = isoPoly(
    [x0 + 0.4, z0 + D - 1.2],
    [x0 + W - 0.4, z0 + D - 1.2],
    [x0 + W - 0.4, z0 + D - 0.9],
    [x0 + 0.4, z0 + D - 0.9],
  );
  const stripeB = isoPoly(
    [x0 + 0.4, z0 + D - 0.7],
    [x0 + W - 0.4, z0 + D - 0.7],
    [x0 + W - 0.4, z0 + D - 0.4],
    [x0 + 0.4, z0 + D - 0.4],
  );
  return (
    <g opacity={dim}>
      <polygon points={outer} fill="#FFFBF5" opacity="0.82" />
      <polygon points={outer} fill="none" stroke={withShade(accent, -0.10)} strokeWidth="0.8" opacity="0.6" />
      <polygon points={tri1} fill={withShade(accent, -0.10)} opacity="0.65" />
      <polygon points={tri2} fill={withShade(accent, +0.10)} opacity="0.65" />
      <polygon points={tri3} fill={withShade(accent, -0.10)} opacity="0.65" />
      <polygon points={tri4} fill={withShade(accent, +0.10)} opacity="0.65" />
      <polygon points={stripeA} fill={withShade(accent, -0.15)} opacity="0.6" />
      <polygon points={stripeB} fill={withShade(accent, +0.05)} opacity="0.6" />
    </g>
  );
}

function Fishbowl({ wx, wz, state }: { wx: number; wz: number; state: RoomState }) {
  // Tiny stand + glass bowl on top
  const dim = state === 'critical' ? 0.65 : 1;
  const SW = 0.9, SD = 0.9, SH = 0.6;
  const front = isoPoly(
    [wx, wz + SD, 0],
    [wx + SW, wz + SD, 0],
    [wx + SW, wz + SD, SH],
    [wx, wz + SD, SH],
  );
  const right = isoPoly(
    [wx + SW, wz, 0],
    [wx + SW, wz + SD, 0],
    [wx + SW, wz + SD, SH],
    [wx + SW, wz, SH],
  );
  const top = isoPoly(
    [wx, wz, SH],
    [wx + SW, wz, SH],
    [wx + SW, wz + SD, SH],
    [wx, wz + SD, SH],
  );
  const c = iso(wx + SW / 2, wz + SD / 2, SH);
  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <polygon points={right} fill="#7B5436" />
      <polygon points={front} fill="#8B5E3C" />
      <polygon points={top} fill="#A37148" />
      {/* Glass bowl */}
      <ellipse cx={c.x} cy={c.y - 14} rx="14" ry="13" fill="#A8DADC" opacity="0.55" stroke="#5C8A8C" strokeWidth="1" />
      {/* Water line */}
      <ellipse cx={c.x} cy={c.y - 17} rx="11" ry="2.4" fill="#88BBD8" opacity="0.7" />
      {/* Fish (orange) */}
      <ellipse cx={c.x - 2} cy={c.y - 12} rx="3" ry="1.8" fill="#E89B6B" />
      <polygon
        points={`${c.x - 5},${c.y - 12} ${c.x - 7},${c.y - 13.5} ${c.x - 7},${c.y - 10.5}`}
        fill="#E89B6B"
      />
      <circle cx={c.x - 1} cy={c.y - 12.4} r="0.4" fill="#3F2718" />
      {/* Bubbles */}
      <circle cx={c.x + 4} cy={c.y - 14} r="0.8" fill="#FFFBF5" opacity="0.85" />
      <circle cx={c.x + 5} cy={c.y - 17} r="0.6" fill="#FFFBF5" opacity="0.85" />
    </g>
  );
}

function CatBed({
  wx,
  wz,
  accent,
  state,
}: {
  wx: number;
  wz: number;
  accent: string;
  state: RoomState;
}) {
  const c = iso(wx, wz);
  const dim = state === 'critical' ? 0.65 : 1;
  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <ellipse cx={c.x} cy={c.y + 6} rx="28" ry="8" fill="rgba(0,0,0,0.18)" />
      {/* Bed cushion */}
      <ellipse cx={c.x} cy={c.y - 2} rx="26" ry="13" fill={withShade(accent, -0.15)} />
      <ellipse cx={c.x} cy={c.y - 5} rx="20" ry="9" fill={withShade(accent, +0.15)} />
      {/* Sleeping cat curl (gray cat) — only when not critical */}
      {state !== 'critical' && (
        <g>
          <ellipse cx={c.x} cy={c.y - 7} rx="14" ry="6" fill="#A89C82" />
          {/* head */}
          <circle cx={c.x + 10} cy={c.y - 9} r="5" fill="#A89C82" />
          {/* ears */}
          <polygon
            points={`${c.x + 7},${c.y - 13} ${c.x + 9},${c.y - 16} ${c.x + 11},${c.y - 13}`}
            fill="#A89C82"
          />
          <polygon
            points={`${c.x + 11},${c.y - 13} ${c.x + 13},${c.y - 16} ${c.x + 14},${c.y - 13}`}
            fill="#A89C82"
          />
          {/* closed eyes */}
          <path d={`M ${c.x + 8} ${c.y - 10} q 1 1 2 0`} stroke="#3F2718" strokeWidth="0.7" fill="none" />
          <path d={`M ${c.x + 11} ${c.y - 10} q 1 1 2 0`} stroke="#3F2718" strokeWidth="0.7" fill="none" />
          {/* tail wrap */}
          <path
            d={`M ${c.x - 12} ${c.y - 7} q -6 -2 -6 4 q 4 4 10 1`}
            fill="#A89C82"
          />
        </g>
      )}
    </g>
  );
}

function Console({ wx, wz, state }: { wx: number; wz: number; state: RoomState }) {
  // Small game console + controller sitting on top of TV cabinet level (just on floor for simplicity)
  const c = iso(wx, wz);
  const dim = state === 'critical' ? 0.7 : 1;
  return (
    <g filter="url(#iso-shadow)" opacity={dim}>
      <ellipse cx={c.x} cy={c.y + 5} rx="18" ry="4" fill="rgba(0,0,0,0.18)" />
      {/* Console body */}
      <rect x={c.x - 14} y={c.y - 6} width="28" height="10" rx="2" fill="#3F4855" />
      <rect x={c.x - 14} y={c.y - 6} width="28" height="3" rx="2" fill="#52606D" />
      {/* Power LED */}
      <circle cx={c.x + 10} cy={c.y} r="1" fill={state === 'critical' ? '#7A2424' : '#7AD0FF'} />
      {/* Controller */}
      <ellipse cx={c.x - 8} cy={c.y + 8} rx="9" ry="3.5" fill="#52606D" />
      <circle cx={c.x - 11} cy={c.y + 8} r="1.5" fill="#3F4855" />
      <circle cx={c.x - 5} cy={c.y + 8} r="1.5" fill="#3F4855" />
    </g>
  );
}

function Whiteboard({ state }: { state: RoomState }) {
  // Mounted on back wall, left of window
  const FX0 = 1.2, FX1 = 3.4, FY0 = 4.0, FY1 = 6.4;
  const tl = iso(FX0, 0, FY1);
  const tr = iso(FX1, 0, FY1);
  const br = iso(FX1, 0, FY0);
  const bl = iso(FX0, 0, FY0);
  const points = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
  const dim = state === 'critical' ? 0.55 : 1;
  // Sample doodled lines
  const lineY1 = (tl.y + bl.y) * 0.35 + tl.y * 0.15;
  const lineY2 = (tl.y + bl.y) * 0.55 + tl.y * 0.05;
  const lineY3 = (tl.y + bl.y) * 0.78;
  const innerL = (tl.x + bl.x) / 2 - 16;
  const innerR = (tr.x + br.x) / 2 + 14;
  return (
    <g opacity={dim}>
      <polygon points={points} fill="#FFFBF5" />
      <polygon points={points} fill="none" stroke="#3F4855" strokeWidth="2" />
      {/* Doodle bullets */}
      <circle cx={innerL + 2} cy={lineY1} r="1.5" fill="#5C8A6B" />
      <line x1={innerL + 6} y1={lineY1} x2={innerR - 4} y2={lineY1} stroke="#3F2718" strokeWidth="1" />
      <circle cx={innerL + 2} cy={lineY2} r="1.5" fill="#E89B6B" />
      <line x1={innerL + 6} y1={lineY2} x2={innerR - 16} y2={lineY2} stroke="#3F2718" strokeWidth="1" />
      <circle cx={innerL + 2} cy={lineY3} r="1.5" fill="#88BBD8" />
      <line x1={innerL + 6} y1={lineY3} x2={innerR - 8} y2={lineY3} stroke="#3F2718" strokeWidth="1" />
      {/* Marker tray */}
      <line
        x1={iso(FX0 - 0.1, 0, FY0 - 0.05).x} y1={iso(FX0 - 0.1, 0, FY0 - 0.05).y}
        x2={iso(FX1 + 0.1, 0, FY0 - 0.05).x} y2={iso(FX1 + 0.1, 0, FY0 - 0.05).y}
        stroke="#5A6470" strokeWidth="2.5" strokeLinecap="round"
      />
    </g>
  );
}

function Calendar({ state }: { state: RoomState }) {
  // Mounted on back wall, near right
  const FX0 = 8.6, FX1 = 9.4, FY0 = 5.4, FY1 = 6.6;
  const tl = iso(FX0, 0, FY1);
  const tr = iso(FX1, 0, FY1);
  const br = iso(FX1, 0, FY0);
  const bl = iso(FX0, 0, FY0);
  const points = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
  const dim = state === 'critical' ? 0.55 : 1;
  // Header band
  const headBL = iso(FX0, 0, FY1 - 0.35);
  const headBR = iso(FX1, 0, FY1 - 0.35);
  const headPoints = `${tl.x},${tl.y} ${tr.x},${tr.y} ${headBR.x},${headBR.y} ${headBL.x},${headBL.y}`;
  // Body grid (3 cols × 3 rows)
  const cells: React.ReactElement[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const fx0 = FX0 + 0.1 + c * ((FX1 - FX0 - 0.2) / 3);
      const fx1 = fx0 + (FX1 - FX0 - 0.2) / 3 - 0.05;
      const fy1 = (FY1 - 0.4) - r * ((FY1 - FY0 - 0.5) / 3);
      const fy0 = fy1 - (FY1 - FY0 - 0.5) / 3 + 0.05;
      const cellPts = isoPoly([fx0, 0, fy0], [fx1, 0, fy0], [fx1, 0, fy1], [fx0, 0, fy1]);
      cells.push(
        <polygon
          key={`cal-${r}-${c}`}
          points={cellPts}
          fill="none"
          stroke="#7B5436"
          strokeWidth="0.5"
          opacity="0.7"
        />
      );
    }
  }
  // Highlight today (middle cell)
  const today = iso((FX0 + FX1) / 2, 0, (FY0 + FY1) / 2 - 0.05);
  return (
    <g opacity={dim}>
      <polygon points={points} fill="#FFFBF5" />
      <polygon points={points} fill="none" stroke="#7B5436" strokeWidth="1.5" />
      <polygon points={headPoints} fill="#C46E52" />
      {cells}
      <circle cx={today.x} cy={today.y} r="3" fill="#C46E52" opacity="0.85" />
      {/* hanger nail */}
      <circle cx={(tl.x + tr.x) / 2} cy={(tl.y + tr.y) / 2 - 3} r="1" fill="#3F2718" />
      <line
        x1={(tl.x + tr.x) / 2 - 2} y1={(tl.y + tr.y) / 2 - 3}
        x2={(tl.x + tr.x) / 2} y2={tl.y + 0.5}
        stroke="#3F2718" strokeWidth="0.6"
      />
      <line
        x1={(tl.x + tr.x) / 2 + 2} y1={(tl.y + tr.y) / 2 - 3}
        x2={(tl.x + tr.x) / 2} y2={tl.y + 0.5}
        stroke="#3F2718" strokeWidth="0.6"
      />
    </g>
  );
}

// ============================================================
// Wall decor
// ============================================================

function BackWallWindow({
  timeOfDay,
  weather,
  reduced,
}: {
  timeOfDay: TimeOfDay;
  weather: Weather;
  reduced: boolean;
}) {
  // Window frame: x = 4..8, y = 3..7, z = 0
  const FX0 = 4, FX1 = 8, FY0 = 3, FY1 = 7;
  const tl = iso(FX0, 0, FY1);
  const tr = iso(FX1, 0, FY1);
  const br = iso(FX1, 0, FY0);
  const bl = iso(FX0, 0, FY0);
  const points = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

  // Window viewport bounds (for clip + interior layout)
  const skyX = Math.min(tl.x, bl.x);
  const skyY = Math.min(tl.y, tr.y);
  const skyW = Math.max(tr.x, br.x) - skyX;
  const skyH = Math.max(bl.y, br.y) - skyY;

  // Cross at midpoints
  const tm = iso((FX0 + FX1) / 2, 0, FY1);
  const bm = iso((FX0 + FX1) / 2, 0, FY0);
  const lm = iso(FX0, 0, (FY0 + FY1) / 2);
  const rm = iso(FX1, 0, (FY0 + FY1) / 2);

  // Sun/moon position based on time
  const sunCx = (tl.x + tr.x) / 2 + (timeOfDay === 'morning' ? -18 : timeOfDay === 'evening' ? 18 : 0);
  const sunCy = (tl.y + bl.y) / 2 - 10 + (timeOfDay === 'evening' ? 6 : 0);
  const isNight = timeOfDay === 'night';
  const isDay = timeOfDay === 'morning' || timeOfDay === 'afternoon';

  // Per-clip id for sky elements (so birds/clouds/rain don't escape window)
  const clipId = 'iso-sky-clip';

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <polygon points={points} />
        </clipPath>
      </defs>

      {/* Sky */}
      <polygon points={points} fill="url(#iso-sky)" />

      {/* All sky-internal elements clipped to the window */}
      <g clipPath={`url(#${clipId})`}>
        {/* ── Sun / Moon ── */}
        <circle cx={sunCx} cy={sunCy} r="14" fill="url(#iso-sun)" opacity={isNight ? 0.85 : 0.95} />
        {isNight && (
          // Subtle moon craters
          <g opacity="0.35">
            <circle cx={sunCx - 4} cy={sunCy - 2} r="2" fill="#9A9AB0" />
            <circle cx={sunCx + 3} cy={sunCy + 3} r="1.5" fill="#9A9AB0" />
          </g>
        )}

        {/* ── Stars (night) ── */}
        {isNight && (
          <g>
            {[
              { x: skyX + 12, y: skyY + 8 },
              { x: skyX + 28, y: skyY + 16 },
              { x: skyX + skyW - 18, y: skyY + 6 },
              { x: skyX + skyW - 30, y: skyY + 22 },
              { x: skyX + 50, y: skyY + 28 },
              { x: skyX + skyW - 50, y: skyY + 14 },
            ].map((p, i) => (
              <g key={`star-${i}`} className="cm-star" style={{ animationDelay: `${i * 0.5}s` }}>
                <circle cx={p.x} cy={p.y} r="1.3" fill="#FFFBE0" />
                <circle cx={p.x} cy={p.y} r="0.5" fill="#FFFFFF" />
              </g>
            ))}
          </g>
        )}

        {/* ── Sun rays (sunny + daytime) ── */}
        {!reduced && weather === 'sunny' && isDay && (
          <g className="cm-sun-rays" opacity="0.55" pointerEvents="none">
            {[-30, -15, 0, 15, 30].map((deg) => (
              <line
                key={deg}
                x1={sunCx} y1={sunCy}
                x2={sunCx + Math.sin((deg * Math.PI) / 180) * 28}
                y2={sunCy - Math.cos((deg * Math.PI) / 180) * 28}
                stroke="#FFE8A0" strokeWidth="1.4" strokeLinecap="round"
              />
            ))}
          </g>
        )}

        {/* ── Birds (morning) ── */}
        {!reduced && timeOfDay === 'morning' && (
          <g opacity="0.7">
            {[0, 1].map((i) => (
              <g key={`bird-${i}`} className="cm-bird" style={{ animationDelay: `${i * 1.4}s` }}>
                <path
                  d={`M ${skyX + 24 + i * 18} ${skyY + 18 + i * 6} q 4 -4 8 0 q 4 -4 8 0`}
                  stroke="#3F2718" strokeWidth="1.2" fill="none" strokeLinecap="round"
                />
              </g>
            ))}
          </g>
        )}

        {/* ── Clouds (afternoon always 1; cloudy → bigger 3) ── */}
        {timeOfDay === 'afternoon' && weather !== 'rainy' && weather !== 'snowy' && (
          <g opacity="0.85">
            <Cloud x={skyX + 18} y={skyY + 12} scale={0.9} drift />
            {weather === 'cloudy' && (
              <>
                <Cloud x={skyX + skyW - 40} y={skyY + 8} scale={1.0} drift />
                <Cloud x={skyX + skyW * 0.45} y={skyY + 26} scale={0.7} />
              </>
            )}
          </g>
        )}
        {/* Cloudy at other times of day too */}
        {weather === 'cloudy' && timeOfDay !== 'afternoon' && (
          <g opacity={isNight ? 0.45 : 0.7}>
            <Cloud x={skyX + 14} y={skyY + 14} scale={0.8} drift={!reduced} dark={isNight} />
            <Cloud x={skyX + skyW - 38} y={skyY + 22} scale={0.9} dark={isNight} />
          </g>
        )}

        {/* ── Rain droplets (rainy) ── */}
        {weather === 'rainy' && !reduced && (
          <g>
            {Array.from({ length: 12 }).map((_, i) => {
              const px = skyX + 6 + ((i * 11) % (skyW - 12));
              const py = skyY + 4 + (i % 4) * 8;
              return (
                <line
                  key={`r-${i}`}
                  x1={px} y1={py}
                  x2={px - 2} y2={py + 7}
                  stroke="#A8DADC" strokeWidth="1.3"
                  className="cm-rain-drop"
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              );
            })}
          </g>
        )}

        {/* ── Snowflakes (snowy) ── */}
        {weather === 'snowy' && !reduced && (
          <g>
            {Array.from({ length: 10 }).map((_, i) => {
              const px = skyX + 6 + ((i * 13) % (skyW - 12));
              return (
                <circle
                  key={`s-${i}`} cx={px} cy={skyY - 2}
                  r={i % 2 === 0 ? 1.6 : 1.2} fill="#FFFBF5"
                  className="cm-snow-flake"
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              );
            })}
          </g>
        )}
      </g>

      {/* ── Window pane glaze (subtle) ── */}
      <polygon points={points} fill="#FFFBF5" opacity={isNight ? 0 : 0.05} />

      {/* Frame */}
      <polygon points={points} fill="none" stroke="#7B5436" strokeWidth="3" strokeLinejoin="round" />
      <line x1={tm.x} y1={tm.y} x2={bm.x} y2={bm.y} stroke="#7B5436" strokeWidth="2.5" />
      <line x1={lm.x} y1={lm.y} x2={rm.x} y2={rm.y} stroke="#7B5436" strokeWidth="2.5" />

      {/* Window sill (thin ledge under the window) */}
      <line
        x1={iso(FX0 - 0.2, 0, FY0).x} y1={iso(FX0 - 0.2, 0, FY0).y}
        x2={iso(FX1 + 0.2, 0, FY0).x} y2={iso(FX1 + 0.2, 0, FY0).y}
        stroke="#9B6440" strokeWidth="3.5" strokeLinecap="round"
      />
    </g>
  );
}

/** Small puffy cloud — composed of 3 overlapping ellipses. */
function Cloud({
  x, y, scale = 1, drift = false, dark = false,
}: {
  x: number; y: number; scale?: number; drift?: boolean; dark?: boolean;
}) {
  const fill = dark ? '#C8C4BC' : '#FFFBF5';
  const shadow = dark ? '#A8A39A' : '#E8DFC9';
  return (
    <g
      transform={`translate(${x},${y}) scale(${scale})`}
      className={drift ? 'cm-cloud' : ''}
    >
      <ellipse cx="14" cy="6" rx="10" ry="6" fill={shadow} opacity="0.5" />
      <ellipse cx="0" cy="0" rx="7" ry="5" fill={fill} />
      <ellipse cx="9" cy="-2" rx="9" ry="6" fill={fill} />
      <ellipse cx="18" cy="2" rx="7" ry="5" fill={fill} />
    </g>
  );
}

function BackWallFrame({ state }: { state: RoomState }) {
  // Picture frame on back wall, right side
  const FX0 = 9.5, FX1 = 11.0, FY0 = 4.5, FY1 = 6.0;
  const tl = iso(FX0, 0, FY1);
  const tr = iso(FX1, 0, FY1);
  const br = iso(FX1, 0, FY0);
  const bl = iso(FX0, 0, FY0);
  const points = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
  const dim = state === 'critical' ? 0.55 : 1;
  return (
    <g opacity={dim}>
      <polygon points={points} fill="#FFFBF5" />
      <polygon points={points} fill="none" stroke="#7B5436" strokeWidth="2.2" />
      {/* Cute landscape: hill + sun */}
      <ellipse cx={(tl.x + tr.x) / 2 + 6} cy={(tl.y + bl.y) / 2 - 2} rx="5" ry="5" fill="#F4C75A" />
      <path
        d={`M ${bl.x + 4} ${bl.y - 4} Q ${(bl.x + br.x) / 2} ${bl.y - 14} ${br.x - 4} ${br.y - 4}`}
        fill="#88BB8E"
      />
    </g>
  );
}

function LeftWallClock({ hourDeg, minDeg, state }: { hourDeg: number; minDeg: number; state: RoomState }) {
  // Clock on left wall, around z=2.5, y=5.5
  const c = iso(0, 2.5, 5.5);
  const dim = state === 'critical' ? 0.6 : 1;
  return (
    <g opacity={dim} transform={`translate(${c.x}, ${c.y})`}>
      <circle cx="0" cy="0" r="20" fill="#FFFBF5" stroke="#7B5436" strokeWidth="2" />
      {/* Hour markers */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const ang = (i * 30) * (Math.PI / 180);
        const x1 = Math.sin(ang) * 16;
        const y1 = -Math.cos(ang) * 16;
        const x2 = Math.sin(ang) * 19;
        const y2 = -Math.cos(ang) * 19;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#7B5436" strokeWidth="1.2" />;
      })}
      {/* Hour hand */}
      <line
        x1="0" y1="0"
        x2={Math.sin((hourDeg * Math.PI) / 180) * 9}
        y2={-Math.cos((hourDeg * Math.PI) / 180) * 9}
        stroke="#3F2718" strokeWidth="2.4" strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="0" y1="0"
        x2={Math.sin((minDeg * Math.PI) / 180) * 14}
        y2={-Math.cos((minDeg * Math.PI) / 180) * 14}
        stroke="#3F2718" strokeWidth="1.6" strokeLinecap="round"
      />
      <circle cx="0" cy="0" r="2" fill="#7B5436" />
    </g>
  );
}

function LeftWallFrame({ state }: { state: RoomState }) {
  // Sunflower frame on left wall
  const c = iso(0, 8, 5);
  const dim = state === 'critical' ? 0.55 : 1;
  return (
    <g opacity={dim} transform={`translate(${c.x}, ${c.y})`}>
      <rect x="-14" y="-18" width="28" height="36" rx="2" fill="#FFFBF5" stroke="#7B5436" strokeWidth="2" />
      {/* Sunflower */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="0" cy="0" rx="4" ry="8"
          fill="#F4C75A"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="4" fill="#7B5436" />
      <rect x="-1" y="4" width="2" height="14" fill="#5C8A6B" />
    </g>
  );
}

// ============================================================
// State-based decor
// ============================================================

function DustBunnies({ isCritical }: { isCritical: boolean }) {
  // 3-4 dust bunnies on the floor at various spots
  const positions: Array<[number, number]> = [
    [3.0, 4.0],
    [8.5, 5.5],
    [5.5, 9.0],
    ...(isCritical ? ([[2.0, 9.5], [10.0, 8.5]] as Array<[number, number]>) : []),
  ];
  return (
    <g>
      {positions.map(([wx, wz], i) => {
        const c = iso(wx, wz);
        return (
          <g key={i} transform={`translate(${c.x}, ${c.y})`}>
            <ellipse cx="0" cy="2" rx="9" ry="3" fill="rgba(0,0,0,0.18)" />
            <circle cx="-3" cy="-1" r="4" fill="#A89C82" />
            <circle cx="3" cy="-2" r="5" fill="#9B8E72" />
            <circle cx="0" cy="-4" r="3" fill="#B5AA92" />
            {/* tiny eyes */}
            <circle cx="-1" cy="-3" r="0.8" fill="#3F2718" />
            <circle cx="1.5" cy="-3" r="0.8" fill="#3F2718" />
          </g>
        );
      })}
    </g>
  );
}

function Cobwebs() {
  // Two cobwebs in upper corners (back-left, back-right)
  return (
    <g opacity="0.7">
      {/* Back-left corner of back wall */}
      {(() => {
        const a = iso(0, 0, 8);
        return (
          <g transform={`translate(${a.x + 2}, ${a.y + 2})`}>
            <path d="M 0 0 L 30 5 L 22 22 L 0 18 Z" fill="none" stroke="#FFFBF5" strokeWidth="0.7" />
            <line x1="0" y1="0" x2="22" y2="22" stroke="#FFFBF5" strokeWidth="0.5" />
            <line x1="0" y1="0" x2="30" y2="5" stroke="#FFFBF5" strokeWidth="0.5" />
            <circle cx="14" cy="13" r="1.5" fill="#3F2718" />
          </g>
        );
      })()}
      {/* Back-right corner */}
      {(() => {
        const a = iso(12, 0, 8);
        return (
          <g transform={`translate(${a.x - 30}, ${a.y + 2})`}>
            <path d="M 30 0 L 0 6 L 8 22 L 30 18 Z" fill="none" stroke="#FFFBF5" strokeWidth="0.7" />
            <line x1="30" y1="0" x2="8" y2="22" stroke="#FFFBF5" strokeWidth="0.5" />
          </g>
        );
      })()}
    </g>
  );
}

function Sparkles() {
  // Subtle ambient sparkles around the room (clean state)
  const pts: Array<[number, number]> = [
    [3, 3], [9, 4], [6, 7], [2, 8], [10, 9],
  ];
  return (
    <g>
      {pts.map(([wx, wz], i) => {
        const p = iso(wx, wz, 1.5);
        return (
          <g key={i} className="cm-spark" style={{ animationDelay: `${i * 0.7}s` }}>
            <circle cx={p.x} cy={p.y} r="1.8" fill="#FFFBE0" />
            <circle cx={p.x} cy={p.y} r="0.7" fill="#FFFBE0" opacity="0.9" />
          </g>
        );
      })}
    </g>
  );
}

// ============================================================
// Color helpers
// ============================================================

/** Lighten (positive) or darken (negative) a hex color by a percentage. */
function withShade(hex: string, amount: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const adj = (c: number) => {
    if (amount >= 0) return Math.min(255, Math.round(c + (255 - c) * amount));
    return Math.max(0, Math.round(c * (1 + amount)));
  };
  const rr = adj(r), gg = adj(g), bb = adj(b);
  return `#${[rr, gg, bb].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

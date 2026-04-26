'use client';

import React from 'react';
import { THEME } from '@/lib/constants';
import type { RoomState } from '@/types/app';
import { Character } from './Character';

interface LivingRoomProps {
  state: RoomState;
}

/**
 * Isometric-ish living room SVG that visually reflects the room's cleanliness state.
 * Stateless — all visual tokens come from THEME[state].
 */
export function LivingRoom({ state }: LivingRoomProps) {
  const t = THEME[state];
  const isCritical = state === 'critical';
  const isDirty = state === 'dirty' || isCritical;

  const dustBunnies = isDirty
    ? [
        { x: 60, y: 280, size: 22 },
        { x: 280, y: 275, size: 18 },
        { x: 180, y: 290, size: 14 },
        ...(isCritical
          ? [
              { x: 120, y: 285, size: 28 },
              { x: 320, y: 285, size: 20 },
            ]
          : []),
      ]
    : [];

  return (
    <div className="relative w-full" style={{ aspectRatio: '1/1', maxWidth: '420px', margin: '0 auto' }}>
      <svg viewBox="0 0 400 400" className="w-full h-full" style={{ transition: 'all 800ms ease-in-out' }}>
        <defs>
          <linearGradient id={`sky-${state}`} x1="0" x2="0" y1="0" y2="1">
            {state === 'clean' && (
              <>
                <stop offset="0%" stopColor="#FCE8C8" />
                <stop offset="50%" stopColor="#F8D4A0" />
                <stop offset="100%" stopColor="#F5C184" />
              </>
            )}
            {state === 'ok' && (
              <>
                <stop offset="0%" stopColor="#E8DFD0" />
                <stop offset="100%" stopColor="#B8A586" />
              </>
            )}
            {state === 'dirty' && (
              <>
                <stop offset="0%" stopColor="#7A6450" />
                <stop offset="100%" stopColor="#3E2F23" />
              </>
            )}
            {state === 'critical' && (
              <>
                <stop offset="0%" stopColor="#2D1E15" />
                <stop offset="100%" stopColor="#1A0F08" />
              </>
            )}
          </linearGradient>
          <linearGradient id={`wall-${state}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={t.wallTop} />
            <stop offset="100%" stopColor={t.wall} />
          </linearGradient>
          <linearGradient id={`floor-${state}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={t.floor} />
            <stop offset="100%" stopColor={t.floorShadow} />
          </linearGradient>
        </defs>

        <rect width="400" height="280" fill={`url(#wall-${state})`} />

        {/* Window */}
        <g>
          <rect x="70" y="50" width="160" height="150" rx="4" fill={`url(#sky-${state})`} />
          <rect x="70" y="50" width="160" height="150" rx="4" fill="none" stroke={t.accentDark} strokeWidth="3" opacity="0.6" />
          <line x1="150" y1="50" x2="150" y2="200" stroke={t.accentDark} strokeWidth="2" opacity="0.4" />
          <line x1="70" y1="125" x2="230" y2="125" stroke={t.accentDark} strokeWidth="2" opacity="0.4" />

          {state === 'clean' && (
            <circle cx="195" cy="90" r="18" fill="#FFF5DA" opacity="0.9">
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
            </circle>
          )}
          {state === 'ok' && <circle cx="195" cy="90" r="14" fill="#E8DFD0" opacity="0.5" />}
          {isDirty && (
            <g opacity="0.8">
              {[...Array(isCritical ? 10 : 6)].map((_, i) => (
                <line
                  key={i}
                  x1={85 + i * 16}
                  y1={60 + (i % 2) * 10}
                  x2={80 + i * 16}
                  y2={90 + (i % 2) * 10}
                  stroke={isCritical ? '#8AAACC' : '#A8B8C8'}
                  strokeWidth="1.5"
                  opacity="0.7"
                >
                  <animate attributeName="y1" from={40 + (i % 2) * 10} to={180} dur={`${0.6 + (i % 3) * 0.2}s`} repeatCount="indefinite" />
                  <animate attributeName="y2" from={70 + (i % 2) * 10} to={210} dur={`${0.6 + (i % 3) * 0.2}s`} repeatCount="indefinite" />
                </line>
              ))}
              {isCritical && (
                <path d="M 170 70 L 160 100 L 175 100 L 165 130" stroke="#FFE066" strokeWidth="3" fill="none" opacity="0.8">
                  <animate attributeName="opacity" values="0;1;0;0" dur="2.5s" repeatCount="indefinite" />
                </path>
              )}
            </g>
          )}
        </g>

        {/* Plant */}
        {(state === 'clean' || state === 'ok') && (
          <g>
            <rect x="280" y="70" width="60" height="70" rx="2" fill="#FFFBF5" stroke={t.accentDark} strokeWidth="2" />
            <text x="310" y="115" textAnchor="middle" fontSize="32">
              {state === 'clean' ? '🌻' : '🌿'}
            </text>
          </g>
        )}
        {isDirty && (
          <g opacity="0.9">
            <rect x="280" y="70" width="60" height="70" rx="2" fill={t.wall} stroke={t.accentDark} strokeWidth="2" />
            <text x="310" y="115" textAnchor="middle" fontSize="28" opacity="0.4">
              {isCritical ? '💀' : '🥀'}
            </text>
          </g>
        )}

        {/* Floor */}
        <polygon points="0,280 400,280 400,400 0,400" fill={`url(#floor-${state})`} />
        <line x1="0" y1="280" x2="400" y2="280" stroke={t.accentDark} strokeWidth="1.5" opacity="0.3" />
        <ellipse cx="200" cy="350" rx="140" ry="25" fill={t.accentDark} opacity="0.2" />

        {/* Sofa */}
        <g>
          <rect x="20" y="240" width="90" height="45" rx="3" fill={t.accentDark} opacity="0.85" />
          <rect x="20" y="235" width="90" height="10" rx="3" fill={t.accent} opacity="0.9" />
          <rect x="28" y="228" width="25" height="12" rx="2" fill={isCritical ? '#8B3A3A' : '#FFFBF5'} opacity={isDirty ? 0.5 : 1} />
        </g>

        {/* Table */}
        <g>
          <rect x="290" y="260" width="80" height="6" fill={t.accent} />
          <rect x="295" y="266" width="6" height="19" fill={t.accentDark} />
          <rect x="359" y="266" width="6" height="19" fill={t.accentDark} />
          <rect x="315" y="248" width="12" height="14" rx="1" fill={isDirty ? t.accentDark : '#FFFBF5'} opacity={isCritical ? 0.4 : 0.9} />
          {state === 'clean' && (
            <ellipse cx="321" cy="246" rx="6" ry="2" fill="#D4824A" opacity="0.6">
              <animate attributeName="cy" values="246;244;246" dur="2s" repeatCount="indefinite" />
            </ellipse>
          )}
        </g>

        <Character state={state} x={200} y={240} />

        {/* Dust bunnies */}
        {dustBunnies.map((d, i) => (
          <g key={i}>
            <ellipse cx={d.x} cy={d.y + d.size / 2} rx={d.size / 2 + 2} ry={2} fill="#000" opacity="0.2" />
            <circle cx={d.x} cy={d.y} r={d.size / 2} fill={t.particle} opacity="0.8">
              <animate attributeName="cy" values={`${d.y};${d.y - 3};${d.y}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={d.x - d.size / 6} cy={d.y - 1} r="1.2" fill="#000" opacity="0.7" />
            <circle cx={d.x + d.size / 6} cy={d.y - 1} r="1.2" fill="#000" opacity="0.7" />
            {[...Array(4)].map((_, j) => (
              <line
                key={j}
                x1={d.x}
                y1={d.y}
                x2={d.x + Math.cos((j / 4) * Math.PI * 2) * (d.size / 2 + 3)}
                y2={d.y + Math.sin((j / 4) * Math.PI * 2) * (d.size / 2 + 3)}
                stroke={t.particle}
                strokeWidth="1.5"
                opacity="0.6"
              />
            ))}
          </g>
        ))}

        {/* Flying fly (critical only) */}
        {isCritical && (
          <text x="100" y="180" fontSize="16" opacity="0.9">
            <animate attributeName="x" values="100;150;120;180;100" dur="6s" repeatCount="indefinite" />
            <animate attributeName="y" values="180;170;200;175;180" dur="6s" repeatCount="indefinite" />
            🪰
          </text>
        )}

        {/* Sparkles (clean only) */}
        {state === 'clean' &&
          [...Array(6)].map((_, i) => (
            <text key={i} x={50 + i * 55} y={100 + (i % 3) * 60} fontSize="12" opacity="0.8">
              <animate attributeName="opacity" values="0;0.8;0" dur={`${2 + (i % 3) * 0.5}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
              ✨
            </text>
          ))}
      </svg>
    </div>
  );
}

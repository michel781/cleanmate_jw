'use client';

import React from 'react';
import { THEME } from '@/lib/constants';
import type { RoomState } from '@/types/app';

interface CharacterProps {
  state: RoomState;
  x: number;
  y: number;
}

export function Character({ state, x, y }: CharacterProps) {
  const t = THEME[state];
  const isHappy = state === 'clean';
  const isCrying = state === 'critical';

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Shadow */}
      <ellipse cx="0" cy="52" rx="30" ry="5" fill="#000" opacity="0.25" />

      {/* Legs */}
      <rect x="-14" y="30" width="10" height="18" rx="5" fill={t.accent} />
      <rect x="4" y="30" width="10" height="18" rx="5" fill={t.accent} />

      {/* Body (head) */}
      <ellipse cx="0" cy="10" rx="28" ry="30" fill={t.accent}>
        <animate attributeName="ry" values="30;31;30" dur="3s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="-6" cy="0" rx="10" ry="14" fill="#FFFBF5" opacity="0.25" />

      {/* Arms */}
      {isHappy ? (
        <>
          <path d="M -26,5 Q -38,-18 -30,-30" stroke={t.accent} strokeWidth="9" strokeLinecap="round" fill="none">
            <animate attributeName="d" values="M -26,5 Q -38,-18 -30,-30; M -26,5 Q -40,-20 -32,-32; M -26,5 Q -38,-18 -30,-30" dur="1.2s" repeatCount="indefinite" />
          </path>
          <path d="M 26,5 Q 38,-18 30,-30" stroke={t.accent} strokeWidth="9" strokeLinecap="round" fill="none">
            <animate attributeName="d" values="M 26,5 Q 38,-18 30,-30; M 26,5 Q 40,-20 32,-32; M 26,5 Q 38,-18 30,-30" dur="1.2s" repeatCount="indefinite" />
          </path>
        </>
      ) : isCrying ? (
        <>
          <path d="M -24,10 Q -20,25 -18,35" stroke={t.accent} strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 24,10 Q 20,25 18,35" stroke={t.accent} strokeWidth="8" strokeLinecap="round" fill="none" />
          <circle cx="-12" cy="-8" r="7" fill={t.accent} />
          <circle cx="12" cy="-8" r="7" fill={t.accent} />
        </>
      ) : (
        <>
          <path d="M -24,10 Q -22,22 -16,30" stroke={t.accent} strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 24,10 Q 22,22 16,30" stroke={t.accent} strokeWidth="8" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Eyes */}
      {isHappy ? (
        <>
          <path d="M -10,-8 Q -6,-12 -2,-8" stroke="#2B2017" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 2,-8 Q 6,-12 10,-8" stroke="#2B2017" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : isCrying ? (
        <>
          <path d="M -12,-10 Q -6,-14 -2,-10 Q -6,-6 -12,-10" fill="#2B2017" />
          <path d="M 2,-10 Q 6,-14 12,-10 Q 6,-6 2,-10" fill="#2B2017" />
          <ellipse cx="-7" cy="-2" rx="2" ry="4" fill="#7BB4E8" opacity="0.9">
            <animate attributeName="cy" values="-2;10;-2" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="7" cy="-2" rx="2" ry="4" fill="#7BB4E8" opacity="0.9">
            <animate attributeName="cy" values="-2;10;-2" dur="1.8s" begin="0.3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" begin="0.3s" repeatCount="indefinite" />
          </ellipse>
        </>
      ) : (
        <>
          <ellipse cx="-7" cy="-8" rx="2.5" ry="3.5" fill="#2B2017" />
          <ellipse cx="7" cy="-8" rx="2.5" ry="3.5" fill="#2B2017" />
          <circle cx="-6" cy="-10" r="1" fill="#FFFBF5" />
          <circle cx="8" cy="-10" r="1" fill="#FFFBF5" />
        </>
      )}

      {/* Cheeks */}
      {(state === 'clean' || state === 'ok') && (
        <>
          <circle cx="-13" cy="0" r="3" fill="#F5A894" opacity="0.6" />
          <circle cx="13" cy="0" r="3" fill="#F5A894" opacity="0.6" />
        </>
      )}

      {/* Mouth */}
      {isHappy && <path d="M -6,5 Q 0,11 6,5" stroke="#2B2017" strokeWidth="2.5" fill="#8B3A3A" fillOpacity="0.3" strokeLinecap="round" />}
      {state === 'ok' && <line x1="-4" y1="6" x2="4" y2="6" stroke="#2B2017" strokeWidth="2" strokeLinecap="round" />}
      {state === 'dirty' && <path d="M -5,8 Q 0,4 5,8" stroke="#2B2017" strokeWidth="2.5" fill="none" strokeLinecap="round" />}
      {isCrying && <ellipse cx="0" cy="8" rx="4" ry="3" fill="#2B2017" />}
    </g>
  );
}

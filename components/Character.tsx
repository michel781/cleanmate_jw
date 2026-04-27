'use client';

import React, { useEffect, useRef, useState } from 'react';
import { THEME } from '@/lib/constants';
import type {
  RoomState,
  Appearance,
  CharacterColor,
  CharacterHat,
  CharacterShirt,
  CharacterAccessory,
} from '@/types/app';

export type ReactionType = 'wave' | 'jump' | 'dance' | 'shy' | 'bow';

const COLOR_FILL: Record<CharacterColor, { fill: string; dark: string }> = {
  brown:    { fill: '#D4824A', dark: '#A35A2B' },
  white:    { fill: '#F5E6D3', dark: '#C8B49A' },
  black:    { fill: '#3D2817', dark: '#1A100A' },
  pink:     { fill: '#FFB6C1', dark: '#D88792' },
  gray:     { fill: '#A0A0A0', dark: '#6E6E6E' },
  caramel:  { fill: '#C68642', dark: '#8E5C25' },
  lavender: { fill: '#B19CD9', dark: '#7C6BAA' },
  mint:     { fill: '#98D8B4', dark: '#5FA984' },
};

interface CharacterProps {
  state: RoomState;
  x?: number;
  y?: number;
  appearance?: Appearance;
  reaction?: ReactionType | null;
  onTap?: () => void;
  reduced?: boolean;
  /** Visual scale only for the character group (preview pages can pass 1.4 etc). */
  scale?: number;
}

export function Character({
  state,
  x = 240,
  y = 320,
  appearance,
  reaction,
  onTap,
  reduced = false,
  scale = 1,
}: CharacterProps) {
  const t = THEME[state];
  const color = appearance?.color ?? 'brown';
  const palette = COLOR_FILL[color];
  const skin = palette.fill;
  const skinDark = palette.dark;

  const isHappy = state === 'clean';
  const isSad = state === 'dirty';
  const isCrying = state === 'critical';

  // 30s blink + 60s look-around
  const [blink, setBlink] = useState(false);
  const [lookAround, setLookAround] = useState(false);
  useEffect(() => {
    if (reduced) return;
    const blinkId = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 160);
    }, 30_000);
    const lookId = window.setInterval(() => {
      setLookAround(true);
      window.setTimeout(() => setLookAround(false), 1200);
    }, 60_000);
    return () => {
      window.clearInterval(blinkId);
      window.clearInterval(lookId);
    };
  }, [reduced]);

  const interactive = Boolean(onTap);
  const transform = `translate(${x}, ${y}) scale(${scale})`;

  return (
    <g
      transform={transform}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? '캐릭터에게 인사하기' : undefined}
      style={interactive ? { cursor: 'pointer' } : undefined}
      onClick={onTap}
      onKeyDown={(e) => {
        if (!onTap) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={[
        'cm-character',
        reaction ? `cm-react-${reaction}` : '',
        isHappy ? 'cm-mood-happy' : '',
        isSad ? 'cm-mood-sad' : '',
        isCrying ? 'cm-mood-cry' : '',
        reduced ? 'cm-reduced' : '',
        lookAround ? 'cm-looking' : '',
      ].join(' ').trim()}
    >
      <CharacterStyles />

      {/* Soft drop shadow */}
      <ellipse cx="0" cy="58" rx="34" ry="6" fill="#000" opacity="0.18" />

      {/* Body group — animated by CSS */}
      <g className="cm-body">
        {/* Legs */}
        <ShirtLegs shirt={appearance?.shirt ?? 'none'} skin={skin} skinDark={skinDark} accent={t.accent} />

        {/* Torso/head */}
        <ellipse cx="0" cy="10" rx="30" ry="32" fill={skin} className="cm-breathe" />
        <ellipse cx="-8" cy="2" rx="11" ry="15" fill="#FFFBF5" opacity="0.22" />

        {/* Shirt overlay */}
        <ShirtTorso shirt={appearance?.shirt ?? 'none'} skin={skin} skinDark={skinDark} />

        {/* Arms */}
        <Arms state={state} reaction={reaction ?? null} skin={skin} />

        {/* Face */}
        <Face
          state={state}
          blink={blink}
          reaction={reaction ?? null}
          skinDark={skinDark}
        />

        {/* Cheeks */}
        {(isHappy || state === 'ok' || reaction === 'shy') && (
          <>
            <circle cx="-14" cy="2" r={reaction === 'shy' ? 5 : 3.5} fill="#F5A894" opacity={reaction === 'shy' ? 0.85 : 0.55} />
            <circle cx="14" cy="2" r={reaction === 'shy' ? 5 : 3.5} fill="#F5A894" opacity={reaction === 'shy' ? 0.85 : 0.55} />
          </>
        )}

        {/* Accessories — bottom layer */}
        <AccessoryLow accessory={appearance?.accessory ?? 'none'} />

        {/* Hat */}
        <Hat hat={appearance?.hat ?? 'none'} skin={skin} skinDark={skinDark} />

        {/* Accessories — top layer (glasses, flower) */}
        <AccessoryHigh accessory={appearance?.accessory ?? 'none'} />
      </g>

      {/* Reaction overlays (speech bubble, particles) */}
      <ReactionOverlay reaction={reaction ?? null} state={state} />

      {/* Ambient idle messages — cycle quietly when there's no active reaction.
          - clean:    occasional ♪ note (humming)
          - dirty:    occasional "...휴" (sigh)
          - critical: occasional "훌쩍..." (sniffle)
       */}
      {!reduced && !reaction && (
        <g pointerEvents="none">
          {state === 'clean' && (
            <g className="cm-ambient cm-ambient-note">
              <text x="38" y="-20" fontSize="16" fontWeight="bold" fill="#5C8A6B">♪</text>
            </g>
          )}
          {state === 'dirty' && (
            <g className="cm-ambient cm-ambient-sigh" transform="translate(38, -22)">
              <ellipse cx="0" cy="0" rx="20" ry="11" fill="#FFFBF5" stroke="#7B5436" strokeWidth="0.7" />
              <text x="0" y="3" fontSize="9" textAnchor="middle" fill="#3F2718">...휴</text>
            </g>
          )}
          {state === 'critical' && (
            <g className="cm-ambient cm-ambient-cry" transform="translate(38, -22)">
              <ellipse cx="0" cy="0" rx="22" ry="11" fill="#FFFBF5" stroke="#7B5436" strokeWidth="0.7" />
              <text x="0" y="3" fontSize="9" textAnchor="middle" fill="#3F2718">훌쩍...</text>
            </g>
          )}
        </g>
      )}
    </g>
  );
}

// ================================================================
// Sub-pieces
// ================================================================

function Arms({ state, reaction, skin }: { state: RoomState; reaction: ReactionType | null; skin: string }) {
  const isHappy = state === 'clean';
  const isCrying = state === 'critical';

  if (reaction === 'wave') {
    return (
      <>
        <path d="M -26,8 Q -42,-14 -34,-30" stroke={skin} strokeWidth="10" strokeLinecap="round" fill="none" className="cm-wave-arm" />
        <path d="M 26,10 Q 24,22 18,30" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (reaction === 'bow') {
    return (
      <>
        <path d="M -22,18 Q -10,32 -2,38" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M 22,18 Q 10,32 2,38" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (reaction === 'dance' || reaction === 'jump') {
    return (
      <>
        <path d="M -26,4 Q -38,-12 -32,-26" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M 26,4 Q 38,-12 32,-26" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (isHappy) {
    return (
      <>
        <path d="M -26,5 Q -38,-18 -30,-30" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M 26,5 Q 38,-18 30,-30" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (isCrying) {
    return (
      <>
        <path d="M -24,10 Q -20,25 -18,35" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
        <path d="M 24,10 Q 20,25 18,35" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      </>
    );
  }
  return (
    <>
      <path d="M -24,10 Q -22,22 -16,30" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M 24,10 Q 22,22 16,30" stroke={skin} strokeWidth="9" strokeLinecap="round" fill="none" />
    </>
  );
}

function Face({
  state,
  blink,
  reaction,
  skinDark,
}: {
  state: RoomState;
  blink: boolean;
  reaction: ReactionType | null;
  skinDark: string;
}) {
  const eyeColor = '#2B2017';
  const isHappy = state === 'clean';
  const isCrying = state === 'critical';
  const happyEyes = isHappy || reaction === 'wave' || reaction === 'jump' || reaction === 'dance';

  if (blink) {
    return (
      <>
        <line x1="-10" y1="-7" x2="-2" y2="-7" stroke={eyeColor} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="2" y1="-7" x2="10" y2="-7" stroke={eyeColor} strokeWidth="2.4" strokeLinecap="round" />
        <Mouth state={state} reaction={reaction} />
      </>
    );
  }

  return (
    <>
      {happyEyes ? (
        <>
          <path d="M -10,-6 Q -6,-12 -2,-6" stroke={eyeColor} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M 2,-6 Q 6,-12 10,-6" stroke={eyeColor} strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </>
      ) : isCrying ? (
        <>
          <path d="M -12,-10 Q -6,-14 -2,-10 Q -6,-6 -12,-10" fill={eyeColor} />
          <path d="M 2,-10 Q 6,-14 12,-10 Q 6,-6 2,-10" fill={eyeColor} />
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
          <ellipse cx="-7" cy="-7" rx="2.6" ry="3.6" fill={eyeColor} />
          <ellipse cx="7" cy="-7" rx="2.6" ry="3.6" fill={eyeColor} />
          <circle cx="-6" cy="-9" r="1" fill="#FFFBF5" />
          <circle cx="8" cy="-9" r="1" fill="#FFFBF5" />
        </>
      )}
      <Mouth state={state} reaction={reaction} />
      {/* nose */}
      <ellipse cx="0" cy="0" rx="2.6" ry="2" fill={skinDark} opacity="0.5" />
    </>
  );
}

function Mouth({ state, reaction }: { state: RoomState; reaction: ReactionType | null }) {
  if (reaction === 'shy') {
    return <path d="M -3,8 Q 0,6 3,8" stroke="#2B2017" strokeWidth="2" fill="none" strokeLinecap="round" />;
  }
  if (reaction === 'wave' || reaction === 'jump' || reaction === 'dance') {
    return <path d="M -7,6 Q 0,14 7,6" stroke="#2B2017" strokeWidth="2.6" fill="#8B3A3A" fillOpacity="0.35" strokeLinecap="round" />;
  }
  if (reaction === 'bow') {
    return <line x1="-4" y1="7" x2="4" y2="7" stroke="#2B2017" strokeWidth="2.2" strokeLinecap="round" />;
  }
  if (state === 'clean') {
    return <path d="M -6,5 Q 0,11 6,5" stroke="#2B2017" strokeWidth="2.5" fill="#8B3A3A" fillOpacity="0.3" strokeLinecap="round" />;
  }
  if (state === 'ok') {
    return <line x1="-4" y1="6" x2="4" y2="6" stroke="#2B2017" strokeWidth="2" strokeLinecap="round" />;
  }
  if (state === 'dirty') {
    return <path d="M -5,8 Q 0,4 5,8" stroke="#2B2017" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
  }
  return <ellipse cx="0" cy="8" rx="4" ry="3" fill="#2B2017" />;
}

function ShirtTorso({ shirt, skin, skinDark }: { shirt: CharacterShirt; skin: string; skinDark: string }) {
  switch (shirt) {
    case 'stripe':
      return (
        <g>
          <path d="M -22,18 Q 0,30 22,18 L 24,42 Q 0,52 -24,42 Z" fill="#7BB4E8" />
          <line x1="-22" y1="26" x2="22" y2="26" stroke="#FFFBF5" strokeWidth="2.5" />
          <line x1="-22" y1="34" x2="22" y2="34" stroke="#FFFBF5" strokeWidth="2.5" />
        </g>
      );
    case 'hoodie':
      return (
        <g>
          <path d="M -24,16 Q 0,30 24,16 L 26,46 Q 0,54 -26,46 Z" fill="#9C7855" />
          <path d="M -10,16 Q 0,22 10,16 L 8,28 Q 0,32 -8,28 Z" fill="#7A5C3E" />
          <circle cx="-3" cy="34" r="1.2" fill="#FFFBF5" />
          <circle cx="3" cy="34" r="1.2" fill="#FFFBF5" />
        </g>
      );
    case 'overalls':
      return (
        <g>
          <path d="M -22,20 Q 0,30 22,20 L 24,46 Q 0,54 -24,46 Z" fill="#5C7DA8" />
          <rect x="-10" y="6" width="6" height="22" fill="#5C7DA8" rx="2" />
          <rect x="4" y="6" width="6" height="22" fill="#5C7DA8" rx="2" />
          <circle cx="-7" cy="22" r="1.5" fill="#FFD700" />
          <circle cx="7" cy="22" r="1.5" fill="#FFD700" />
        </g>
      );
    case 'cardigan':
      return (
        <g>
          <path d="M -24,18 Q 0,30 24,18 L 26,46 Q 0,54 -26,46 Z" fill="#C9A878" />
          <line x1="0" y1="20" x2="0" y2="50" stroke="#8E7549" strokeWidth="1.5" />
          <circle cx="0" cy="28" r="1.2" fill="#3D2817" />
          <circle cx="0" cy="38" r="1.2" fill="#3D2817" />
        </g>
      );
    case 'pajamas':
      return (
        <g>
          <path d="M -22,18 Q 0,30 22,18 L 24,46 Q 0,54 -24,46 Z" fill="#E8D5F0" />
          <text x="-12" y="36" fontSize="10">⭐</text>
          <text x="6" y="42" fontSize="8">🌙</text>
        </g>
      );
    case 'suit':
      return (
        <g>
          <path d="M -22,18 Q 0,30 22,18 L 24,46 Q 0,54 -24,46 Z" fill="#2B2017" />
          <path d="M -8,18 L 0,32 L 8,18 L 4,46 L -4,46 Z" fill="#FFFBF5" />
          <path d="M -3,28 L 0,34 L 3,28 L 0,40 Z" fill="#C04A1F" />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

function ShirtLegs({ shirt, skin, skinDark, accent }: { shirt: CharacterShirt; skin: string; skinDark: string; accent: string }) {
  let leftFill = skin;
  let rightFill = skin;
  if (shirt === 'overalls') { leftFill = '#5C7DA8'; rightFill = '#5C7DA8'; }
  if (shirt === 'pajamas') { leftFill = '#E8D5F0'; rightFill = '#E8D5F0'; }
  if (shirt === 'suit') { leftFill = '#2B2017'; rightFill = '#2B2017'; }
  return (
    <>
      <rect x="-14" y="32" width="11" height="20" rx="5" fill={leftFill} />
      <rect x="3" y="32" width="11" height="20" rx="5" fill={rightFill} />
    </>
  );
}

function Hat({ hat, skin, skinDark }: { hat: CharacterHat; skin: string; skinDark: string }) {
  switch (hat) {
    case 'beanie':
      return (
        <g>
          <ellipse cx="0" cy="-22" rx="28" ry="14" fill="#C04A1F" />
          <rect x="-26" y="-22" width="52" height="6" rx="3" fill="#8B3A20" />
          <circle cx="0" cy="-36" r="6" fill="#FFFBF5" />
        </g>
      );
    case 'beret':
      return (
        <g>
          <ellipse cx="0" cy="-22" rx="26" ry="9" fill="#3D2817" />
          <ellipse cx="-6" cy="-26" rx="14" ry="8" fill="#2B2017" />
          <circle cx="-12" cy="-30" r="2.5" fill="#1A100A" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <ellipse cx="0" cy="-20" rx="26" ry="10" fill="#C04A1F" />
          <ellipse cx="14" cy="-12" rx="14" ry="4" fill="#8B3A20" />
          <text x="-4" y="-18" fontSize="9" fill="#FFFBF5" fontWeight="bold">C</text>
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M -22,-18 L -16,-32 L -8,-22 L 0,-34 L 8,-22 L 16,-32 L 22,-18 Z" fill="#FFD700" stroke="#C9A348" strokeWidth="1.5" />
          <circle cx="-12" cy="-22" r="2" fill="#E84A5F" />
          <circle cx="0" cy="-26" r="2.4" fill="#5FA984" />
          <circle cx="12" cy="-22" r="2" fill="#7BB4E8" />
        </g>
      );
    case 'bunny':
      return (
        <g>
          <ellipse cx="0" cy="-20" rx="22" ry="5" fill="#FFB6C1" />
          <ellipse cx="-10" cy="-32" rx="5" ry="12" fill="#FFFBF5" />
          <ellipse cx="-10" cy="-32" rx="2.5" ry="8" fill="#FFB6C1" />
          <ellipse cx="10" cy="-32" rx="5" ry="12" fill="#FFFBF5" />
          <ellipse cx="10" cy="-32" rx="2.5" ry="8" fill="#FFB6C1" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M -26,-12 Q -26,-32 0,-32 Q 26,-32 26,-12" stroke="#3D2817" strokeWidth="4" fill="none" />
          <rect x="-30" y="-14" width="9" height="14" rx="3" fill="#C04A1F" />
          <rect x="21" y="-14" width="9" height="14" rx="3" fill="#C04A1F" />
        </g>
      );
    case 'none':
    default:
      return null;
  }
}

function AccessoryLow({ accessory }: { accessory: CharacterAccessory }) {
  if (accessory === 'scarf') {
    return (
      <g>
        <path d="M -22,12 Q 0,20 22,12 L 24,22 Q 0,30 -24,22 Z" fill="#E84A5F" />
        <path d="M -12,22 L -10,38 L -6,22" fill="#E84A5F" />
        <path d="M -22,12 L 22,12" stroke="#C13344" strokeWidth="1" opacity="0.6" />
      </g>
    );
  }
  return null;
}

function AccessoryHigh({ accessory }: { accessory: CharacterAccessory }) {
  switch (accessory) {
    case 'glasses':
      return (
        <g>
          <circle cx="-7" cy="-6" r="6" fill="none" stroke="#2B2017" strokeWidth="1.6" />
          <circle cx="7" cy="-6" r="6" fill="none" stroke="#2B2017" strokeWidth="1.6" />
          <line x1="-1" y1="-6" x2="1" y2="-6" stroke="#2B2017" strokeWidth="1.6" />
        </g>
      );
    case 'ribbon':
      return (
        <g transform="translate(-14, -24)">
          <path d="M 0,0 L -8,-6 L -8,6 Z" fill="#FFB6C1" />
          <path d="M 0,0 L 8,-6 L 8,6 Z" fill="#FFB6C1" />
          <circle cx="0" cy="0" r="3" fill="#E84A5F" />
        </g>
      );
    case 'flower':
      return (
        <g transform="translate(16, -20)">
          <circle cx="0" cy="0" r="3" fill="#FFD700" />
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <ellipse
              key={i}
              cx={Math.cos((deg * Math.PI) / 180) * 4}
              cy={Math.sin((deg * Math.PI) / 180) * 4}
              rx="3" ry="2"
              fill="#FFB6C1"
              transform={`rotate(${deg} 0 0)`}
            />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function ReactionOverlay({ reaction, state }: { reaction: ReactionType | null; state: RoomState }) {
  if (!reaction) return null;

  if (reaction === 'wave') {
    return <SpeechBubble x={36} y={-30} text="안녕!" />;
  }
  if (reaction === 'shy') {
    return <SpeechBubble x={36} y={-30} text="...히힛" />;
  }
  if (reaction === 'jump') {
    return (
      <g className="cm-hearts" pointerEvents="none">
        <text x="-30" y="-32" fontSize="14">❤️</text>
        <text x="20" y="-40" fontSize="12">❤️</text>
      </g>
    );
  }
  if (reaction === 'dance') {
    return (
      <g className="cm-notes" pointerEvents="none">
        <text x="-34" y="-30" fontSize="14">♪</text>
        <text x="22" y="-36" fontSize="14">♫</text>
      </g>
    );
  }
  if (reaction === 'bow') {
    return (
      <g className="cm-sparkles" pointerEvents="none">
        <text x="-30" y="-28" fontSize="14">✨</text>
        <text x="20" y="-32" fontSize="12">✨</text>
      </g>
    );
  }
  return null;
}

function SpeechBubble({ x, y, text }: { x: number; y: number; text: string }) {
  const w = Math.max(48, text.length * 11 + 14);
  return (
    <g pointerEvents="none" className="cm-bubble">
      <rect x={x} y={y} width={w} height="22" rx="11" fill="#FFFBF5" stroke="#2B2017" strokeWidth="1.4" />
      <path d={`M ${x + 12} ${y + 22} L ${x + 4} ${y + 30} L ${x + 18} ${y + 22} Z`} fill="#FFFBF5" stroke="#2B2017" strokeWidth="1.4" />
      <text x={x + w / 2} y={y + 15} fontSize="12" textAnchor="middle" fill="#2B2017" fontWeight="bold">{text}</text>
    </g>
  );
}

// ================================================================
// CSS keyframes (injected once)
// ================================================================
function CharacterStyles() {
  return (
    <style>{`
      .cm-character .cm-body { transform-box: fill-box; transform-origin: center; }
      .cm-character .cm-breathe { animation: cm-breathe 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      @keyframes cm-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.02); } }

      .cm-character:hover .cm-body { transform: scale(1.05); }
      .cm-character:focus { outline: none; }
      .cm-character:focus-visible .cm-body { filter: drop-shadow(0 0 4px #D4824A); }

      /* Reactions */
      .cm-react-jump .cm-body { animation: cm-jump 1.5s ease-out 1; }
      @keyframes cm-jump {
        0% { transform: translateY(0); }
        25% { transform: translateY(-22px); }
        50% { transform: translateY(0); }
        75% { transform: translateY(-12px); }
        100% { transform: translateY(0); }
      }
      .cm-react-dance .cm-body { animation: cm-dance 1.5s ease-in-out 1; }
      @keyframes cm-dance {
        0%, 100% { transform: rotate(0); }
        20% { transform: rotate(-8deg); }
        40% { transform: rotate(8deg); }
        60% { transform: rotate(-8deg); }
        80% { transform: rotate(8deg); }
      }
      .cm-react-shy .cm-body { animation: cm-shy 1.5s ease-out 1; }
      @keyframes cm-shy {
        0% { transform: translateX(0); }
        40% { transform: translateX(-8px); }
        100% { transform: translateX(0); }
      }
      .cm-react-bow .cm-body { animation: cm-bow 1.5s ease-out 1; transform-origin: 0 50px; }
      @keyframes cm-bow {
        0% { transform: rotate(0); }
        40% { transform: rotate(35deg); }
        80% { transform: rotate(35deg); }
        100% { transform: rotate(0); }
      }
      .cm-react-wave .cm-wave-arm {
        transform-box: fill-box; transform-origin: bottom right;
        animation: cm-wave 0.5s ease-in-out 3;
      }
      @keyframes cm-wave { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-22deg); } }

      /* Idle bobs by mood */
      .cm-mood-happy .cm-body { animation: cm-happy-bob 4s ease-in-out infinite, cm-breathe 3s ease-in-out infinite; }
      @keyframes cm-happy-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }

      .cm-mood-sad .cm-body { animation: cm-sad-sigh 6s ease-in-out infinite; }
      @keyframes cm-sad-sigh { 0%,90%,100% { transform: translateY(0); } 95% { transform: translateY(2px); } }

      .cm-mood-cry .cm-body { animation: cm-cry 4s ease-in-out infinite; }
      @keyframes cm-cry { 0%,100% { transform: translateY(0); } 25% { transform: translateY(1px); } 50% { transform: translateY(-1px); } 75% { transform: translateY(1px); } }

      /* Look around */
      .cm-looking .cm-body { animation: cm-look 1.2s ease-in-out 1; }
      @keyframes cm-look { 0%,100% { transform: rotate(0); } 30% { transform: rotate(-6deg); } 70% { transform: rotate(6deg); } }

      /* Particles */
      .cm-bubble, .cm-hearts, .cm-notes, .cm-sparkles { animation: cm-fade 1.5s ease-out 1; }
      @keyframes cm-fade { 0% { opacity: 0; transform: translateY(4px); } 20% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-6px); } }

      /* Ambient idle (mood-driven, infinite loop, brief flash) */
      .cm-ambient { opacity: 0; }
      .cm-ambient-note { animation: cm-amb-note 14s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .cm-ambient-sigh { animation: cm-amb-sad 16s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .cm-ambient-cry  { animation: cm-amb-sad 18s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      @keyframes cm-amb-note {
        0%, 86%   { opacity: 0; transform: translateY(0); }
        90%       { opacity: 1; transform: translateY(0); }
        96%       { opacity: 1; transform: translateY(-6px); }
        100%      { opacity: 0; transform: translateY(-12px); }
      }
      @keyframes cm-amb-sad {
        0%, 88%   { opacity: 0; }
        92%, 96%  { opacity: 1; }
        100%      { opacity: 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .cm-character *, .cm-breathe, .cm-body { animation: none !important; transition: none !important; }
      }
      .cm-reduced .cm-body, .cm-reduced .cm-breathe { animation: none !important; }
    `}</style>
  );
}

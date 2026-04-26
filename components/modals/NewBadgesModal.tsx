'use client';

import type { BadgeDefinition } from '@/types/app';

interface Props {
  badges: BadgeDefinition[];
  bgInner: string;
  accent: string;
  accentDark: string;
  text: string;
  onClose: () => void;
}

export function NewBadgesModal({ badges, bgInner, accent, accentDark, text, onClose }: Props) {
  if (badges.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-3xl p-6 animate-bounce-in text-center"
        style={{ background: bgInner, color: text }}
      >
        <div className="text-xs font-bold opacity-70 mb-1">🎉 새 배지 획득!</div>
        <div className="text-lg font-black mb-4">{badges.length}개의 업적</div>

        <div className="space-y-3 mb-5">
          {badges.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accentDark})`, color: '#FFFBF5' }}
            >
              <div className="text-3xl">{b.icon}</div>
              <div className="flex-1 text-left">
                <div className="font-black text-sm">{b.name}</div>
                <div className="text-[11px] opacity-90">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-bold"
          style={{ background: accent, color: '#FFFBF5' }}
        >
          확인
        </button>
      </div>
    </div>
  );
}

'use client';

import { REJECT_REASONS } from '@/lib/constants';
import type { Verification } from '@/types/app';

interface Props {
  verification: Verification;
  saving: boolean;
  bgInner: string;
  accent: string;
  text: string;
  onReject: (reason: string) => void;
  onCancel: () => void;
}

export function RejectDialog({
  verification, saving, bgInner, accent, text, onReject, onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-3xl p-6 animate-slide-up"
        style={{ background: bgInner }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: `${accent}30` }} />
        <div className="text-base font-bold mb-1">왜 다시 해야 할까요?</div>
        <div className="text-xs opacity-60 mb-4">{verification.task?.name} 인증을 반려해요</div>
        <div className="space-y-2">
          {REJECT_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => onReject(r)}
              disabled={saving}
              className="w-full text-left p-3.5 rounded-xl text-sm font-bold disabled:opacity-50"
              style={{ background: `${accent}15`, color: text }}
            >
              {r}
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="w-full p-3 mt-3 rounded-xl text-xs opacity-60">
          취소
        </button>
      </div>
    </div>
  );
}

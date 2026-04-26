'use client';

import { Share2, Copy } from 'lucide-react';

interface Props {
  inviteCode: string;
  bgInner: string;
  accent: string;
  onShare: () => void;
  onClose: () => void;
}

export function ShareModal({ inviteCode, bgInner, accent, onShare, onClose }: Props) {
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-3xl p-6 animate-slide-up"
        style={{ background: bgInner }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: `${accent}30` }} />
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">💌</div>
          <div className="text-lg font-bold mb-1">파트너 초대</div>
          <div className="text-xs opacity-60">초대 코드를 공유해서 같은 파티에 들어오게 해요</div>
        </div>
        <div className="rounded-2xl p-4 mb-4 text-center" style={{ background: `${accent}15` }}>
          <div className="text-[10px] opacity-70 mb-1">초대 코드</div>
          <div className="text-3xl font-black font-mono tracking-widest" style={{ color: accent }}>
            {inviteCode}
          </div>
        </div>
        <button
          onClick={onShare}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 mb-2"
          style={{ background: accent, color: '#FFFBF5', boxShadow: `0 8px 24px ${accent}50` }}
        >
          {canNativeShare ? <><Share2 size={18} /> 공유하기</> : <><Copy size={18} /> 링크 복사</>}
        </button>
        <button onClick={onClose} className="w-full p-3 rounded-xl text-xs opacity-60">
          닫기
        </button>
      </div>
    </div>
  );
}

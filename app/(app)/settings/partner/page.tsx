'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Share2 } from 'lucide-react';
import { useAppContext } from '../../AppDataProvider';
import { shareOrCopy, buildInviteMessage } from '@/lib/utils/share';

export default function PartnerSettingsPage() {
  const router = useRouter();
  const { data, theme: t, cardBg, me, showToast } = useAppContext();

  async function handleShare() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const result = await shareOrCopy({
      title: 'CleanMate',
      text: buildInviteMessage(me.name, data.party.invite_code, siteUrl),
    });
    if (result === 'shared') showToast('공유했어요 💌');
    else if (result === 'copied') showToast('링크를 복사했어요 📋');
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(data.party.invite_code);
    showToast('초대 코드를 복사했어요 📋');
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/settings')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="font-bold text-base">파트너 초대</div>
          <div className="text-[11px] opacity-60">{data.party.name}</div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div className="rounded-2xl p-6 text-center" style={{ background: cardBg }}>
          <div className="text-5xl mb-3">💌</div>
          <div className="text-sm font-bold mb-1">초대 코드를 공유하세요</div>
          <div className="text-xs opacity-60 mb-4">코드를 받은 사람이 링크에 접속하면 같은 파티에 들어와요</div>
          <button
            onClick={handleCopyCode}
            className="rounded-2xl py-4 px-5 mb-3 w-full flex items-center justify-between"
            style={{ background: `${t.accent}15` }}
          >
            <div className="text-left">
              <div className="text-[10px] opacity-70">초대 코드</div>
              <div className="text-3xl font-black font-mono tracking-widest" style={{ color: t.accent }}>
                {data.party.invite_code}
              </div>
            </div>
            <Copy size={18} style={{ color: t.accent }} />
          </button>
          <button
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: t.accent, color: '#FFFBF5', boxShadow: `0 6px 20px ${t.accent}50` }}
          >
            {canNativeShare ? <><Share2 size={16} /> 공유하기</> : <><Copy size={16} /> 링크 복사</>}
          </button>
        </div>

        <div className="rounded-2xl p-4" style={{ background: cardBg }}>
          <div className="text-xs font-bold opacity-70 mb-3">파티 멤버 ({data.members.length}명)</div>
          {data.members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: `${t.accent}20` }}>
                {m.emoji}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">
                  {m.name} {m.id === data.userId && <span className="text-[10px] opacity-60">(나)</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

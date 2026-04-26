'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Flame, History } from 'lucide-react';
import { useAppContext } from '../AppDataProvider';

export default function StatsPage() {
  const router = useRouter();
  const { data, theme: t, cardBg } = useAppContext();

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="font-bold text-base">우리 파티</div>
          <div className="text-[11px] opacity-60">통계 및 기록</div>
        </div>
      </div>

      <div
        className="mx-5 rounded-2xl p-5 mb-4"
        style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`, color: '#FFFBF5' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Flame size={18} />
          <span className="font-bold text-sm opacity-90">파티 스트릭</span>
        </div>
        <div className="text-5xl font-black font-display">{data.streak?.current ?? 0}일 🔥</div>
        <div className="text-xs opacity-80 mt-1">
          최장 {data.streak?.longest ?? 0}일 · 프리즈 {data.streak?.freezes ?? 0}개 남음
        </div>
      </div>

      <div className="px-5">
        <h3 className="text-sm font-bold mb-3">기여도 랭킹</h3>
        <div className="space-y-3">
          {[...data.members]
            .map((m) => ({
              ...m,
              score: data.scores.find((s) => s.user_id === m.id)?.score ?? 0,
            }))
            .sort((a, b) => b.score - a.score)
            .map((m, idx) => (
              <div
                key={m.id}
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{ background: cardBg, border: idx === 0 ? `2px solid ${t.accent}` : 'none' }}
              >
                <div className="text-xs font-black opacity-40 w-4">{idx === 0 ? '🥇' : '🥈'}</div>
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                  style={{ background: `${t.accent}20` }}
                >
                  {m.emoji}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{m.name}</div>
                </div>
                <div className="text-2xl font-black font-display" style={{ color: t.accent }}>
                  {m.score}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <Link
          href="/activity"
          className="block w-full rounded-2xl p-4 flex items-center justify-between"
          style={{ background: cardBg }}
        >
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: t.accent }} />
            <span className="font-bold text-sm">전체 활동 기록</span>
          </div>
          <ChevronRight size={16} style={{ color: t.accent }} />
        </Link>
      </div>
    </div>
  );
}

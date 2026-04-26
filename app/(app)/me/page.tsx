'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Award, ChevronRight, Settings, Trophy } from 'lucide-react';
import { useAppContext } from '../AppDataProvider';
import { BADGES } from '@/lib/constants';

export default function MyPage() {
  const router = useRouter();
  const { data, theme: t, cardBg, me, myLevel } = useAppContext();

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
            <ArrowLeft size={18} />
          </button>
          <div className="font-bold text-base">마이페이지</div>
        </div>
        <Link
          href="/me/edit"
          className="text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: `${t.accent}15`, color: t.accent }}
        >
          편집
        </Link>
      </div>

      <div
        className="mx-5 rounded-2xl p-5 mb-4"
        style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`, color: '#FFFBF5' }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {me.emoji}
          </div>
          <div>
            <div className="text-xl font-black">{me.name}</div>
            <div className="text-xs opacity-90 flex items-center gap-1">
              <Award size={12} /> Lv.{myLevel.level} · {myLevel.title}
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1.5 opacity-90">
            <span>{myLevel.currentXP} XP</span>
            {myLevel.requiredXP && <span>다음까지 {myLevel.requiredXP - myLevel.currentXP} XP</span>}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: myLevel.requiredXP ? `${(myLevel.currentXP / myLevel.requiredXP) * 100}%` : '100%',
                background: '#FFFBF5',
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-5">
        <h3 className="text-sm font-bold mb-3">내 기록</h3>
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-2xl p-3 text-center" style={{ background: cardBg }}>
            <div className="text-xl mb-1">🔥</div>
            <div className="text-xl font-black font-display" style={{ color: t.accent }}>
              {data.streak?.current ?? 0}
            </div>
            <div className="text-[10px] opacity-60 font-bold">스트릭</div>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: cardBg }}>
            <div className="text-xl mb-1">✅</div>
            <div className="text-xl font-black font-display" style={{ color: t.accent }}>
              {data.totals?.approved_count ?? 0}
            </div>
            <div className="text-[10px] opacity-60 font-bold">완료</div>
          </div>
          <div className="rounded-2xl p-3 text-center" style={{ background: cardBg }}>
            <div className="text-xl mb-1">🏆</div>
            <div className="text-xl font-black font-display" style={{ color: t.accent }}>
              {data.badges.length}
            </div>
            <div className="text-[10px] opacity-60 font-bold">배지</div>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <Link
          href="/achievements"
          className="block w-full rounded-2xl p-4 flex items-center justify-between"
          style={{ background: cardBg }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${t.accent}15` }}>
              <Trophy size={16} style={{ color: t.accent }} />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">업적 & 배지</div>
              <div className="text-[10px] opacity-50">
                {data.badges.length}/{BADGES.length} 획득
              </div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: t.accent }} />
        </Link>

        <Link
          href="/settings"
          className="block w-full rounded-2xl p-4 flex items-center justify-between"
          style={{ background: cardBg }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${t.accent}15` }}>
              <Settings size={16} style={{ color: t.accent }} />
            </div>
            <div className="text-left">
              <div className="font-bold text-sm">설정</div>
              <div className="text-[10px] opacity-50">알림, 파티, 로그아웃</div>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: t.accent }} />
        </Link>
      </div>
    </div>
  );
}

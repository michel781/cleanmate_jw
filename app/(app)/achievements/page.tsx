'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '../AppDataProvider';
import { BADGES } from '@/lib/constants';

export default function AchievementsPage() {
  const router = useRouter();
  const { data, theme: t, cardBg } = useAppContext();

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/me')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="font-bold text-base">업적 & 배지</div>
          <div className="text-[11px] opacity-60">
            {data.badges.length}/{BADGES.length} 획득
          </div>
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-2.5">
        {BADGES.map((b, idx) => {
          const unlocked = data.badges.find((ub) => ub.badge_id === b.id);
          return (
            <div
              key={b.id}
              className="rounded-2xl p-4 text-center animate-slide-up"
              style={{ background: cardBg, opacity: unlocked ? 1 : 0.4, animationDelay: `${idx * 40}ms` }}
            >
              <div className="text-4xl mb-2" style={{ filter: unlocked ? 'none' : 'grayscale(1)' }}>
                {b.icon}
              </div>
              <div className="text-sm font-bold mb-1">{b.name}</div>
              <div className="text-[10px] opacity-70 leading-relaxed">{b.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

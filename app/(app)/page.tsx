'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, Flame, ChevronRight, Share2, Check, Clock, Users,
} from 'lucide-react';
import { LivingRoom } from '@/components/LivingRoom';
import { ShareModal } from '@/components/modals/ShareModal';
import { useAppContext } from './AppDataProvider';
import { getDaysSince } from '@/lib/domain/score';
import { shareOrCopy, buildInviteMessage } from '@/lib/utils/share';
import type { Task } from '@/types/app';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function HomePage() {
  const router = useRouter();
  const {
    data, theme: t, state, score, cardBg, bgInner,
    me, myLevel, pendingForMe, sentByMe, showToast,
  } = useAppContext();

  const [showShareModal, setShowShareModal] = useState(false);

  // Sort: overdue first, then due/normal, then pending (확인대기), then done (완료) at the bottom.
  const sortedTasks = useMemo(() => {
    const now = Date.now();
    const pendingIds = new Set(
      [...sentByMe, ...pendingForMe].map((v) => v.task_id)
    );

    function bucket(task: Task): number {
      const lastMs = task.last_done_at ? new Date(task.last_done_at).getTime() : 0;
      const isDone = lastMs > 0 && now - lastMs < DAY_MS;
      if (isDone) return 4;
      if (pendingIds.has(task.id)) return 3;
      const daysSince = getDaysSince(task.last_done_at);
      if (daysSince > task.cycle) return 1; // overdue
      return 2;                              // normal
    }

    return [...data.tasks].sort((a, b) => {
      const ba = bucket(a);
      const bb = bucket(b);
      if (ba !== bb) return ba - bb;
      // tie-breaker within the same bucket: more days overdue first
      return getDaysSince(b.last_done_at) - getDaysSince(a.last_done_at);
    });
  }, [data.tasks, pendingForMe, sentByMe]);

  async function handleShare() {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const result = await shareOrCopy({
      title: 'CleanMate',
      text: buildInviteMessage(me.name, data.party.invite_code, siteUrl),
    });
    if (result === 'shared') showToast('공유했어요 💌');
    else if (result === 'copied') showToast('링크를 복사했어요 📋');
    setShowShareModal(false);
  }

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/me" className="flex items-center gap-2 active:scale-95 transition-transform">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: t.accent, color: '#FFFBF5' }}
          >
            {me.emoji}
          </div>
          <div className="text-left">
            <div className="text-[11px] opacity-60 leading-none">
              Lv.{myLevel.level} {myLevel.title}
            </div>
            <div className="text-sm font-bold leading-tight">{me.name} 님</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 rounded-xl active:scale-90 transition-transform"
            style={{ background: `${t.accent}15` }}
          >
            <Share2 size={18} style={{ color: t.text }} />
          </button>
          <Link
            href="/inbox"
            className="relative p-2 rounded-xl active:scale-90 transition-transform"
            style={{ background: `${t.accent}15` }}
          >
            <Bell size={18} style={{ color: t.text }} />
            {pendingForMe.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce-in"
                style={{ background: t.accent, color: '#FFFBF5' }}
              >
                {pendingForMe.length}
              </span>
            )}
          </Link>
          <div
            className="flex items-center gap-1 px-3 py-2 rounded-xl"
            style={{ background: t.accent, color: '#FFFBF5' }}
          >
            <Flame size={16} />
            <span className="text-sm font-bold">{data.streak?.current ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{t.moodEmoji}</span>
            <div>
              <div className="text-[11px] opacity-60 leading-none">우리 집 상태</div>
              <div className="text-base font-bold leading-tight">{t.mood}</div>
            </div>
          </div>
          <div
            className="text-3xl font-black tracking-tight font-display"
            style={{ color: t.accent }}
          >
            {score}
          </div>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: `${t.accent}20` }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${score}%`,
              background: `linear-gradient(90deg, ${t.accent} 0%, ${t.accentDark} 100%)`,
              transition: 'width 1000ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
      </div>

      <div className="px-3 py-2">
        <LivingRoom
          state={state}
          appearance={me.appearance}
          layout={me.room_layout}
          onCharacterTap={() => { /* tap reactions handled inside LivingRoom */ }}
        />
      </div>

      <div className="px-5 mt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold">오늘의 할 일</h2>
          <Link
            href="/tasks"
            className="text-[11px] opacity-70 flex items-center gap-0.5 px-2 py-1 rounded-md"
            style={{ background: `${t.accent}15` }}
          >
            관리 <ChevronRight size={11} />
          </Link>
        </div>

        {data.tasks.length === 0 && (
          <div className="text-center py-8 rounded-2xl" style={{ background: cardBg }}>
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-sm font-bold mb-1">청소 항목이 없어요</div>
            <div className="text-xs opacity-60 mb-3">첫 항목을 추가해보세요</div>
            <Link
              href="/tasks/new"
              className="inline-block px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: t.accent, color: '#FFFBF5' }}
            >
              + 청소 항목 추가
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {sortedTasks.map((task, idx) => {
            const daysSince = getDaysSince(task.last_done_at);
            const isDone = task.last_done_at && Date.now() - new Date(task.last_done_at).getTime() < 24 * 3600 * 1000;
            const isPending = [...sentByMe, ...pendingForMe].some((v) => v.task_id === task.id);
            const isOverdue = daysSince > task.cycle;
            const isAssigned = !task.assigned_to || task.assigned_to === data.userId;
            const disabled = Boolean(isDone) || isPending || !isAssigned;

            return (
              <button
                key={task.id}
                onClick={() => !disabled && router.push(`/camera/${task.id}`)}
                disabled={disabled}
                className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98] text-left animate-slide-up"
                style={{
                  background: isDone ? `${t.accent}20` : cardBg,
                  border: `1.5px solid ${isOverdue ? t.accent : 'transparent'}`,
                  opacity: isDone ? 0.5 : !isAssigned ? 0.6 : 1,
                  animationDelay: `${idx * 60}ms`,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: isDone ? t.accent : `${t.accent}15` }}
                >
                  {isDone ? <Check size={20} color="#FFFBF5" /> : task.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[15px] truncate">{task.name}</span>
                    {isOverdue && !isDone && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{ background: t.accent, color: '#FFFBF5' }}
                      >
                        밀림
                      </span>
                    )}
                    {isPending && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
                        style={{ background: `${t.accent}30`, color: t.accent }}
                      >
                        <Clock size={8} /> 확인대기
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5 flex items-center gap-2">
                    <span>
                      {!task.assigned_to
                        ? '👥 공동'
                        : task.assigned_to === data.userId
                        ? '⭐ 내 담당'
                        : `🤝 ${data.members.find((m) => m.id === task.assigned_to)?.name ?? '파트너'}`}
                    </span>
                    <span>·</span>
                    <span>{task.cycle}일 주기</span>
                    {daysSince > 0 && (
                      <>
                        <span>·</span>
                        <span>{daysSince}일 경과</span>
                      </>
                    )}
                  </div>
                </div>
                {!disabled && (
                  <ChevronRight size={18} style={{ color: t.accent }} className="flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-5">
        <Link
          href="/stats"
          className="block w-full rounded-2xl p-4 active:scale-[0.98] transition-transform"
          style={{ background: cardBg }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: t.accent }} />
              <span className="font-bold text-sm">우리 파티</span>
            </div>
            <ChevronRight size={16} style={{ color: t.accent }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {data.members.slice(0, 2).map((m) => {
              const s = data.scores.find((x) => x.user_id === m.id)?.score ?? 0;
              const maxScore = Math.max(...data.scores.map((x) => x.score), 1);
              return (
                <div key={m.id} className="text-left">
                  <div className="text-[11px] opacity-60 mb-1">
                    {m.emoji} {m.name}
                  </div>
                  <div className="text-xl font-black font-display" style={{ color: t.accent }}>
                    {s}
                  </div>
                  <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: `${t.accent}20` }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(s / maxScore) * 100}%`, background: t.accent, transition: 'width 600ms' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Link>
      </div>

      {showShareModal && (
        <ShareModal
          inviteCode={data.party.invite_code}
          bgInner={bgInner}
          accent={t.accent}
          onShare={handleShare}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Clock, Plus, Trash2, User, Users, XCircle,
} from 'lucide-react';
import { useAppContext } from '../AppDataProvider';
import { formatShortDateTime } from '@/lib/utils/date';

export default function ActivityPage() {
  const router = useRouter();
  const { data, theme: t, cardBg } = useAppContext();

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/stats')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="font-bold text-base">활동 기록</div>
          <div className="text-[11px] opacity-60">최근 {data.activity.length}개</div>
        </div>
      </div>
      <div className="px-5 space-y-1.5">
        {data.activity.map((a, idx) => {
          const actor = data.members.find((m) => m.id === a.actor_id);
          const md = a.metadata as { task_name?: string; emoji?: string };
          return (
            <div
              key={a.id}
              className="rounded-xl p-3 flex items-center gap-3 animate-slide-up"
              style={{ background: cardBg, animationDelay: `${Math.min(idx, 10) * 30}ms` }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${t.accent}15` }}
              >
                {a.type === 'approved' && <CheckCircle2 size={16} style={{ color: t.accent }} />}
                {a.type === 'rejected' && <XCircle size={16} style={{ color: t.accent }} />}
                {a.type === 'request' && <Clock size={16} style={{ color: t.accent }} />}
                {a.type === 'task_added' && <Plus size={16} style={{ color: t.accent }} />}
                {a.type === 'task_deleted' && <Trash2 size={16} style={{ color: t.accent }} />}
                {a.type === 'party_created' && <Users size={16} style={{ color: t.accent }} />}
                {a.type === 'member_joined' && <User size={16} style={{ color: t.accent }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate">
                  {a.type === 'approved' && <>{actor?.name}님의 {md.emoji} {md.task_name} 인증 완료</>}
                  {a.type === 'rejected' && <>{md.emoji} {md.task_name} 재요청</>}
                  {a.type === 'request' && <>{actor?.name}님이 {md.emoji} {md.task_name} 요청</>}
                  {a.type === 'task_added' && <>{md.emoji} {md.task_name} 항목 추가</>}
                  {a.type === 'task_deleted' && <>{md.emoji} {md.task_name} 항목 삭제</>}
                  {a.type === 'party_created' && '우리 파티가 시작됐어요'}
                  {a.type === 'member_joined' && <>{actor?.name}님이 참여했어요</>}
                </div>
                <div className="text-[10px] opacity-50">{formatShortDateTime(a.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

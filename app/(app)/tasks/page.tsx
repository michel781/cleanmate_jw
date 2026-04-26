'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit3, Plus, Trash2 } from 'lucide-react';
import { useAppContext } from '../AppDataProvider';
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog';
import { CYCLE_OPTIONS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { deleteTask as dbDeleteTask } from '@/lib/db/tasks';
import type { Task } from '@/types/app';

export default function TasksPage() {
  const router = useRouter();
  const {
    data, theme: t, cardBg, bgInner, saving, withSaving, reload,
  } = useAppContext();
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  async function handleDelete() {
    if (!deletingTask) return;
    await withSaving(async () => {
      const supabase = createClient();
      await dbDeleteTask(supabase, deletingTask.id);
      await reload();
      setDeletingTask(null);
    });
  }

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="font-bold text-base">청소 항목 관리</div>
            <div className="text-[11px] opacity-60">{data.tasks.length}개의 항목</div>
          </div>
        </div>
        <Link
          href="/tasks/new"
          className="p-2 rounded-xl"
          style={{ background: t.accent, color: '#FFFBF5' }}
        >
          <Plus size={18} />
        </Link>
      </div>
      <div className="px-5 space-y-2">
        {data.tasks.map((task, idx) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 rounded-2xl animate-slide-up"
            style={{ background: cardBg, animationDelay: `${idx * 40}ms` }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: `${t.accent}15` }}
            >
              {task.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px] truncate">{task.name}</div>
              <div className="text-[11px] opacity-60 mt-0.5">
                {CYCLE_OPTIONS.find((c) => c.value === task.cycle)?.label ?? `${task.cycle}일`} ·
                {!task.assigned_to
                  ? ' 공동'
                  : ` ${data.members.find((m) => m.id === task.assigned_to)?.name ?? '담당자'}`}
              </div>
            </div>
            <Link
              href={`/tasks/${task.id}/edit`}
              className="p-2 rounded-lg"
              style={{ background: `${t.accent}15` }}
            >
              <Edit3 size={14} style={{ color: t.accent }} />
            </Link>
            <button
              onClick={() => setDeletingTask(task)}
              className="p-2 rounded-lg"
              style={{ background: `${t.accent}15` }}
            >
              <Trash2 size={14} style={{ color: t.accent }} />
            </button>
          </div>
        ))}
        {data.tasks.length === 0 && (
          <div className="text-center py-16 opacity-50">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm">등록된 청소 항목이 없어요</div>
          </div>
        )}
      </div>

      {deletingTask && (
        <DeleteConfirmDialog
          task={deletingTask}
          saving={saving}
          bgInner={bgInner}
          accent={t.accent}
          text={t.text}
          onDelete={handleDelete}
          onCancel={() => setDeletingTask(null)}
        />
      )}
    </div>
  );
}

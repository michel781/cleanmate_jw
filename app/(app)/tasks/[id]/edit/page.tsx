'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../../AppDataProvider';
import { TaskForm, type TaskFormState } from '@/components/TaskForm';
import { createClient } from '@/lib/supabase/client';
import { updateTask as dbUpdateTask } from '@/lib/db/tasks';

export default function EditTaskPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const {
    data, theme: t, inputBg, saving, withSaving, reload,
  } = useAppContext();

  const task = useMemo(() => data.tasks.find((tk) => tk.id === id), [data.tasks, id]);
  const [form, setForm] = useState<TaskFormState>(() =>
    task
      ? { name: task.name, emoji: task.emoji, cycle: task.cycle, weight: task.weight, assigned_to: task.assigned_to }
      : { name: '', emoji: '🧹', cycle: 7, weight: 10, assigned_to: null }
  );

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={36} style={{ color: t.accent }} />
        <div className="mt-3 text-sm font-bold">청소 항목을 찾을 수 없어요</div>
        <button
          onClick={() => router.push('/tasks')}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: t.accent, color: '#FFFBF5' }}
        >
          목록으로
        </button>
      </div>
    );
  }

  async function handleSubmit() {
    if (!task) return;
    await withSaving(async () => {
      if (!form.name.trim()) throw new Error('이름을 입력해주세요');
      const supabase = createClient();
      await dbUpdateTask(supabase, task.id, form);
      await reload();
      router.push('/tasks');
    });
  }

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/tasks')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div className="font-bold text-base">항목 수정</div>
      </div>
      <TaskForm
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel="저장하기"
        inputBg={inputBg}
        accent={t.accent}
        accentDark={t.accentDark}
        text={t.text}
      />
    </div>
  );
}

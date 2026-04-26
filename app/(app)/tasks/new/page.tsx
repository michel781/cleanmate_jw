'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../AppDataProvider';
import { TaskForm, type TaskFormState } from '@/components/TaskForm';
import { createClient } from '@/lib/supabase/client';
import { createTask as dbCreateTask } from '@/lib/db/tasks';

const INITIAL: TaskFormState = {
  name: '', emoji: '🧹', cycle: 7, weight: 10, assigned_to: null,
};

export default function NewTaskPage() {
  const router = useRouter();
  const {
    data, theme: t, inputBg, saving, withSaving, reload, showToast,
  } = useAppContext();
  const [form, setForm] = useState<TaskFormState>(INITIAL);

  async function handleSubmit() {
    await withSaving(async () => {
      if (!form.name.trim()) throw new Error('이름을 입력해주세요');
      const supabase = createClient();
      await dbCreateTask(supabase, data.party.id, form);
      await reload();
      showToast('청소 항목이 추가됐어요');
      router.push('/tasks');
    });
  }

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/tasks')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div className="font-bold text-base">새 청소 항목</div>
      </div>
      <TaskForm
        value={form}
        onChange={setForm}
        onSubmit={handleSubmit}
        saving={saving}
        submitLabel="추가하기"
        inputBg={inputBg}
        accent={t.accent}
        accentDark={t.accentDark}
        text={t.text}
      />
    </div>
  );
}

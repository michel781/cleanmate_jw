'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAppContext } from '../../AppDataProvider';
import { AVATAR_EMOJIS } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { updateMyProfile } from '@/lib/db/profile';

export default function EditProfilePage() {
  const router = useRouter();
  const {
    theme: t, cardBg, inputBg, me, saving, withSaving, reload, showToast,
  } = useAppContext();

  const [form, setForm] = useState({ name: me.name, emoji: me.emoji });

  async function handleSave() {
    await withSaving(async () => {
      if (!form.name.trim()) throw new Error('이름을 입력해주세요');
      const supabase = createClient();
      await updateMyProfile(supabase, form);
      await reload();
      showToast('프로필이 저장됐어요');
      router.push('/me');
    });
  }

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/me')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div className="font-bold text-base">프로필 수정</div>
      </div>
      <div className="px-5 space-y-5">
        <div className="rounded-2xl p-5 text-center" style={{ background: cardBg }}>
          <div className="text-5xl mb-2">{form.emoji}</div>
          <div className="text-lg font-bold">{form.name || '이름 없음'}</div>
        </div>
        <div>
          <label className="text-[11px] font-bold opacity-70 mb-2 block">이름</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 10) })}
            placeholder="이름"
            className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none"
            style={{ background: inputBg, color: t.text, border: `1.5px solid ${t.accent}30` }}
            maxLength={10}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold opacity-70 mb-2 block">아바타</label>
          <div className="grid grid-cols-8 gap-2">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm({ ...form, emoji: e })}
                className="aspect-square rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: form.emoji === e ? t.accent : `${t.accent}15`,
                  border: form.emoji === e ? `2px solid ${t.accentDark}` : 'none',
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: t.accent, color: '#FFFBF5', boxShadow: `0 8px 24px ${t.accent}50` }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          저장하기
        </button>
      </div>
    </div>
  );
}

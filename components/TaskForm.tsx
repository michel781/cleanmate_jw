'use client';

import { Loader2, Save } from 'lucide-react';
import { TASK_EMOJIS, CYCLE_OPTIONS, WEIGHT_OPTIONS } from '@/lib/constants';

export interface TaskFormState {
  name: string;
  emoji: string;
  cycle: number;
  weight: number;
  assigned_to: string | null;
}

interface Props {
  value: TaskFormState;
  onChange: (next: TaskFormState) => void;
  onSubmit: () => void;
  saving: boolean;
  submitLabel: string;
  inputBg: string;
  cardBg?: string;
  accent: string;
  accentDark: string;
  text: string;
}

export function TaskForm({
  value, onChange, onSubmit, saving, submitLabel,
  inputBg, accent, accentDark, text,
}: Props) {
  return (
    <div className="px-5 space-y-5">
      <div>
        <label className="text-[11px] font-bold opacity-70 mb-2 block">이름</label>
        <input
          type="text"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="예: 베란다 청소"
          className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none"
          style={{ background: inputBg, color: text, border: `1.5px solid ${accent}30` }}
          maxLength={20}
        />
      </div>
      <div>
        <label className="text-[11px] font-bold opacity-70 mb-2 block">아이콘</label>
        <div className="grid grid-cols-8 gap-2">
          {TASK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange({ ...value, emoji: e })}
              className="aspect-square rounded-xl flex items-center justify-center text-xl"
              style={{
                background: value.emoji === e ? accent : `${accent}15`,
                border: value.emoji === e ? `2px solid ${accentDark}` : 'none',
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold opacity-70 mb-2 block">주기</label>
        <div className="grid grid-cols-4 gap-2">
          {CYCLE_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange({ ...value, cycle: c.value })}
              className="py-2.5 rounded-xl text-xs font-bold"
              style={{
                background: value.cycle === c.value ? accent : `${accent}15`,
                color: value.cycle === c.value ? '#FFFBF5' : text,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold opacity-70 mb-2 block">중요도</label>
        <div className="grid grid-cols-3 gap-2">
          {WEIGHT_OPTIONS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => onChange({ ...value, weight: w.value })}
              className="py-3 rounded-xl text-sm font-bold"
              style={{
                background: value.weight === w.value ? accent : `${accent}15`,
                color: value.weight === w.value ? '#FFFBF5' : text,
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onSubmit}
        disabled={saving || !value.name.trim()}
        className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
        style={{ background: accent, color: '#FFFBF5', boxShadow: `0 8px 24px ${accent}50` }}
      >
        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
        {submitLabel}
      </button>
    </div>
  );
}

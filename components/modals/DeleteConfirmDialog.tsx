'use client';

import { Loader2, Trash2 } from 'lucide-react';
import type { Task } from '@/types/app';

interface Props {
  task: Task;
  saving: boolean;
  bgInner: string;
  accent: string;
  text: string;
  onDelete: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  task, saving, bgInner, accent, text, onDelete, onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-2xl p-6 animate-bounce-in"
        style={{ background: bgInner }}
      >
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{task.emoji}</div>
          <div className="text-base font-bold mb-1">정말 삭제할까요?</div>
          <div className="text-xs opacity-60">&apos;{task.name}&apos; 항목을 삭제해요</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: `${accent}15`, color: text }}
          >
            취소
          </button>
          <button
            onClick={onDelete}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ background: '#C46E52', color: '#FFFBF5' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} 삭제
          </button>
        </div>
      </div>
    </div>
  );
}

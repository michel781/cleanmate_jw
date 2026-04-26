'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, Camera, ImagePlus, Loader2,
} from 'lucide-react';
import { useAppContext } from '../../AppDataProvider';
import { createClient } from '@/lib/supabase/client';
import { createVerification, uploadVerificationPhoto } from '@/lib/db/verifications';
import { compressImage } from '@/lib/utils/image';
import {
  isInQuietHours, sendBrowserNotification,
} from '@/lib/utils/notification';

export default function CameraPage() {
  const router = useRouter();
  const { taskId } = useParams<{ taskId: string }>();
  const {
    data, theme: t, me, partner, saving, withSaving, reload, showToast,
  } = useAppContext();

  const task = useMemo(
    () => data.tasks.find((tk) => tk.id === taskId),
    [data.tasks, taskId]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  type Stage = 'idle' | 'compressing' | 'uploading' | 'finalizing';
  const [stage, setStage] = useState<Stage>('idle');
  const [compressPct, setCompressPct] = useState(0);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  if (!task) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={36} style={{ color: t.accent }} />
        <div className="mt-3 text-sm font-bold">청소 항목을 찾을 수 없어요</div>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: t.accent, color: '#FFFBF5' }}
        >
          홈으로
        </button>
      </div>
    );
  }

  async function handlePickPhoto(file: File | null) {
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith('image/')) {
      setPhotoError('이미지 파일만 올릴 수 있어요');
      return;
    }
    setStage('compressing');
    setCompressPct(0);
    try {
      const compressed = await compressImage(file, {
        maxEdge: 1920,
        maxSizeMB: 1,
        onProgress: (p) => setCompressPct(Math.round(p)),
      });
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      setStage('idle');
    } catch (e) {
      setStage('idle');
      setPhotoError((e as Error).message ?? '사진을 불러오지 못했어요');
    }
  }

  async function handleSubmitVerification() {
    if (!task || !photoFile) {
      setPhotoError('인증 사진을 먼저 골라주세요');
      return;
    }
    await withSaving(async () => {
      const supabase = createClient();
      setStage('uploading');
      const photoUrl = await uploadVerificationPhoto(supabase, photoFile, data.userId);
      setStage('finalizing');
      await createVerification(supabase, task.id, {
        photoUrl,
        photoPlaceholder: `${task.emoji}✨`,
      });
      if (data.notifications?.enabled && !isInQuietHours(data.notifications)) {
        sendBrowserNotification(
          `${me.name}님이 인증 요청을 보냈어요`,
          `${task.emoji} ${task.name} — 확인해주세요`
        );
      }
      await reload();
      setStage('idle');
      showToast(`✨ ${task.name} 인증을 보냈어요`);
      router.push('/');
    });
  }

  const stageLabel: Record<Stage, string> = {
    idle: '인증 사진 보내기',
    compressing: `압축 중... ${compressPct}%`,
    uploading: '업로드 중...',
    finalizing: '저장 중...',
  };
  const stageBusy = stage !== 'idle';


  return (
    <div className="animate-fade-in min-h-screen flex flex-col" style={{ background: '#1A1A1A', color: '#FFFBF5' }}>
      <div className="flex items-center justify-between p-5">
        <button onClick={() => router.push('/')} className="p-2 rounded-xl bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <div className="text-sm font-bold">{task.name} 인증</div>
        <div className="w-9" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handlePickPhoto(e.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-square rounded-3xl flex items-center justify-center mb-4 relative overflow-hidden active:scale-[0.99] transition-transform"
          style={{
            background: photoPreview
              ? '#000'
              : `linear-gradient(135deg, ${t.accent}40, ${t.accentDark}60)`,
            border: photoPreview ? 'none' : '2px dashed rgba(255,255,255,0.3)',
          }}
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="인증 사진 미리보기" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="text-7xl mb-3 animate-float">{task.emoji}</div>
              <div className="text-sm opacity-80 font-bold flex items-center justify-center gap-1.5">
                <ImagePlus size={16} /> 사진 찍기 / 고르기
              </div>
              <div className="text-[10px] opacity-50 mt-2">탭해서 카메라 또는 갤러리 열기</div>
            </div>
          )}
        </button>

        {photoPreview && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] underline opacity-70 mb-4"
          >
            다시 고르기
          </button>
        )}

        {photoError && (
          <div className="text-xs mb-3 px-3 py-2 rounded-lg flex items-center gap-1.5" style={{ background: '#C46E52', color: '#FFFBF5' }}>
            <AlertCircle size={12} /> {photoError}
          </div>
        )}

        <div className="text-center mb-6">
          <div className="text-lg font-bold mb-1">{partner?.name ?? '파트너'} 님이 확인하면 완료돼요</div>
        </div>

        {stageBusy && (
          <div className="w-full mb-3">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width:
                    stage === 'compressing' ? `${Math.max(8, compressPct)}%` :
                    stage === 'uploading'   ? '70%' :
                    /* finalizing */          '95%',
                  background: t.accent,
                  transition: 'width 200ms ease-out',
                }}
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSubmitVerification}
          disabled={saving || !photoFile || stageBusy}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: t.accent, color: '#FFFBF5', boxShadow: `0 8px 24px ${t.accent}60` }}
        >
          {stageBusy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          {stageLabel[stage]}
        </button>
      </div>
    </div>
  );
}

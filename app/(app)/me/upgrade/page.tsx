'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, Send, Sparkles,
} from 'lucide-react';
import { useAppContext } from '../../AppDataProvider';
import { createClient } from '@/lib/supabase/client';

export default function UpgradePage() {
  const router = useRouter();
  const { theme: t, cardBg, inputBg, isAnonymous, email } = useAppContext();

  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Already a full account — show confirmation only
  if (!isAnonymous) {
    return (
      <div className="animate-fade-in pb-24">
        <div className="flex items-center gap-3 p-5">
          <button onClick={() => router.push('/me')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
            <ArrowLeft size={18} />
          </button>
          <div className="font-bold text-base">계정 정보</div>
        </div>
        <div className="px-5">
          <div className="rounded-2xl p-5 text-center" style={{ background: cardBg }}>
            <CheckCircle2 size={40} style={{ color: t.accent }} className="mx-auto mb-3" />
            <div className="text-base font-bold mb-1">정식 회원이에요</div>
            <div className="text-xs opacity-70 mb-3">{email}</div>
            <div className="text-[11px] opacity-60 leading-relaxed">
              다른 기기에서 같은 이메일로 로그인하면<br />
              내 데이터를 그대로 볼 수 있어요
            </div>
          </div>
        </div>
      </div>
    );
  }

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function handleSubmit() {
    setErrorMsg(null);
    const trimmed = emailInput.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setErrorMsg('이메일 형식을 확인해주세요');
      return;
    }
    setSending(true);
    try {
      const supabase = createClient();
      // Link this email to the current (anonymous) user. Supabase sends a verification email.
      // After the user clicks the link, the same auth.users row is upgraded — all their data
      // (profile, party, tasks, verifications, scores, streak) is preserved.
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      setErrorMsg((e as Error).message ?? '메일 발송에 실패했어요');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-in pb-24">
        <div className="flex items-center gap-3 p-5">
          <button onClick={() => router.push('/me')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
            <ArrowLeft size={18} />
          </button>
          <div className="font-bold text-base">메일을 보냈어요</div>
        </div>
        <div className="px-5">
          <div className="rounded-2xl p-6 text-center" style={{ background: cardBg }}>
            <Mail size={44} style={{ color: t.accent }} className="mx-auto mb-3 animate-float" />
            <div className="text-base font-bold mb-1">{emailInput}로 보냈어요</div>
            <div className="text-xs opacity-70 mb-4">메일 안의 인증 링크를 클릭하면 정식 회원 전환이 완료돼요.</div>
            <div className="text-[11px] opacity-60 leading-relaxed mb-5">
              메일이 안 보이면 스팸함을 확인해주세요.<br />
              인증 후에는 다른 기기에서도 같은 이메일로 로그인 가능해요.
            </div>
            <button
              onClick={() => router.push('/me')}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: t.accent, color: '#FFFBF5' }}
            >
              마이페이지로
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-24">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/me')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="font-bold text-base">정식 회원으로 전환</div>
          <div className="text-[11px] opacity-60">기존 데이터는 그대로 유지돼요</div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        <div
          className="rounded-2xl p-5"
          style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accentDark})`, color: '#FFFBF5' }}
        >
          <Sparkles size={20} className="mb-2" />
          <div className="text-sm font-bold mb-1">왜 정식 회원이 좋나요?</div>
          <ul className="text-[11px] opacity-95 space-y-1 leading-relaxed">
            <li>· 다른 기기(폰, 태블릿)에서도 같은 데이터를 볼 수 있어요</li>
            <li>· 브라우저를 지우거나 시크릿 창을 종료해도 데이터가 사라지지 않아요</li>
            <li>· 파트너에게 초대 코드 공유 시 본인 신원이 명확해져요</li>
          </ul>
        </div>

        <div className="rounded-2xl p-5" style={{ background: cardBg }}>
          <label className="text-[11px] font-bold opacity-70 mb-2 block">이메일 주소</label>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="off"
            autoComplete="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="you@example.com"
            disabled={sending}
            className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none disabled:opacity-50"
            style={{ background: inputBg, color: t.text, border: `1.5px solid ${t.accent}30` }}
          />
          {errorMsg && (
            <div className="mt-2 text-[11px] flex items-center gap-1.5" style={{ color: '#C46E52' }}>
              <AlertCircle size={12} /> {errorMsg}
            </div>
          )}
          <div className="text-[10px] opacity-60 mt-2 leading-relaxed">
            이 이메일로 인증 링크가 발송돼요. 클릭하면 자동으로 정식 회원으로 전환됩니다.
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={sending || !emailInput.trim()}
          className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: t.accent, color: '#FFFBF5', boxShadow: `0 8px 24px ${t.accent}50` }}
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          {sending ? '메일 보내는 중...' : '인증 메일 보내기'}
        </button>

        <div className="text-[10px] opacity-50 text-center leading-relaxed">
          이메일 외의 다른 정보는 수집하지 않아요.<br />
          전환 후에도 청소 항목/사진/점수/배지가 그대로 유지됩니다.
        </div>
      </div>
    </div>
  );
}

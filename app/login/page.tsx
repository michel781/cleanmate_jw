'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, User2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });

    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  async function handleAnonymous() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError(
        error.message +
          ' (Supabase 대시보드에서 "Enable anonymous sign-ins"를 활성화해주세요)'
      );
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#F5EDE0' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🧹</div>
          <h1 className="text-2xl font-black mb-1">CleanMate</h1>
          <p className="text-xs opacity-60">혼자 하던 청소, 같이 하는 즐거움</p>
        </div>

        {sent ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: '#FFFBF5' }}>
            <Mail size={36} className="mx-auto mb-3" style={{ color: '#D4824A' }} />
            <div className="font-bold mb-1">이메일 확인해주세요</div>
            <div className="text-xs opacity-70">
              {email}로 로그인 링크를 보냈어요
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
                required
                className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none"
                style={{
                  background: '#FFFBF5',
                  border: '1.5px solid #D4824A30',
                  color: '#3D2817',
                }}
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#D4824A', color: '#FFFBF5' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                이메일로 로그인
              </button>
            </form>

            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px" style={{ background: '#D4824A30' }} />
              <span className="text-xs opacity-50">또는</span>
              <div className="flex-1 h-px" style={{ background: '#D4824A30' }} />
            </div>

            <button
              onClick={handleAnonymous}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#FFFBF5', color: '#3D2817', border: '1.5px solid #D4824A30' }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <User2 size={16} />}
              게스트로 빠르게 시작
            </button>

            <p className="text-[11px] opacity-60 text-center mt-4 leading-relaxed">
              게스트 계정은 언제든 이메일로 연결할 수 있어요
            </p>

            {error && (
              <div
                className="mt-3 p-3 rounded-xl text-xs"
                style={{ background: '#C46E5220', color: '#C46E52' }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

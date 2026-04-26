'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, LogIn, Mail, User2, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  function isValidEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearMessages();
    if (!isValidEmail(email)) {
      setError('이메일 형식을 확인해주세요');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요');
      return;
    }
    if (mode === 'signup' && password !== passwordConfirm) {
      setError('비밀번호와 비밀번호 확인이 일치하지 않아요');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes('already registered')
          || error.message.toLowerCase().includes('already exists')) {
          setError('이미 가입된 이메일이에요. 로그인 탭으로 전환해주세요');
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }
      // Confirm email 옵션에 따라 두 가지 케이스:
      // - OFF: data.session 즉시 생성 → 홈으로 이동
      // - ON: data.session=null + 인증 메일 발송 → 안내 화면 표시
      if (!data.session) {
        setMagicSent(true); // "메일 확인해주세요" 화면 재사용
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
      return;
    }

    // mode === 'login'
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        setError('이메일 또는 비밀번호가 일치하지 않아요');
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleMagicLink() {
    clearMessages();
    if (!isValidEmail(email)) {
      setError('이메일을 먼저 입력해주세요');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
    if (error) setError(error.message);
    else setMagicSent(true);
    setLoading(false);
  }

  async function handleAnonymous() {
    clearMessages();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError(
        error.message +
          ' (Supabase 대시보드에서 "Enable anonymous sign-ins"를 활성화해주세요)'
      );
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#F5EDE0' }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧹</div>
          <h1 className="text-2xl font-black mb-1">CleanMate</h1>
          <p className="text-xs opacity-60">혼자 하던 청소, 같이 하는 즐거움</p>
        </div>

        {magicSent ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: '#FFFBF5' }}>
            <Mail size={36} className="mx-auto mb-3" style={{ color: '#D4824A' }} />
            <div className="font-bold mb-1">이메일을 확인해주세요</div>
            <div className="text-xs opacity-70 mb-2">
              <b>{email}</b>로 인증 링크를 보냈어요
            </div>
            <div className="text-[11px] opacity-60 mb-4 leading-relaxed">
              메일 안의 링크를 클릭하면 자동으로 로그인됩니다.<br />
              메일이 안 보이면 스팸함 또는 프로모션 탭을 확인해주세요.
            </div>
            <button
              onClick={() => { setMagicSent(false); clearMessages(); }}
              className="text-xs underline opacity-70"
            >
              다른 방법으로 시도하기
            </button>
          </div>
        ) : (
          <>
            {/* Mode toggle: 로그인 / 회원가입 */}
            <div
              className="flex p-1 rounded-xl mb-4"
              style={{ background: '#FFFBF5', border: '1.5px solid #D4824A30' }}
            >
              <button
                type="button"
                onClick={() => { setMode('login'); setPassword(''); setPasswordConfirm(''); clearMessages(); }}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition"
                style={{
                  background: mode === 'login' ? '#D4824A' : 'transparent',
                  color: mode === 'login' ? '#FFFBF5' : '#3D2817',
                }}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setPassword(''); setPasswordConfirm(''); clearMessages(); }}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition"
                style={{
                  background: mode === 'signup' ? '#D4824A' : 'transparent',
                  color: mode === 'signup' ? '#FFFBF5' : '#3D2817',
                }}
              >
                회원가입
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                  style={{ color: '#3D2817' }}
                />
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="off"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold outline-none"
                  style={{
                    background: '#FFFBF5',
                    border: '1.5px solid #D4824A30',
                    color: '#3D2817',
                  }}
                />
              </div>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                  style={{ color: '#3D2817' }}
                />
                <input
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? '비밀번호 (6자 이상)' : '비밀번호'}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-bold outline-none"
                  style={{
                    background: '#FFFBF5',
                    border: '1.5px solid #D4824A30',
                    color: '#3D2817',
                  }}
                />
              </div>

              {mode === 'signup' && (
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                    style={{ color: '#3D2817' }}
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호 확인"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 rounded-xl text-sm font-bold outline-none"
                    style={{
                      background: '#FFFBF5',
                      border: `1.5px solid ${
                        passwordConfirm.length === 0
                          ? '#D4824A30'
                          : password === passwordConfirm
                          ? '#5C8A6B'
                          : '#C46E52'
                      }`,
                      color: '#3D2817',
                    }}
                  />
                  {passwordConfirm.length > 0 && (
                    <span
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold"
                      style={{
                        color: password === passwordConfirm ? '#5C8A6B' : '#C46E52',
                      }}
                    >
                      {password === passwordConfirm ? '✓ 일치' : '✗ 불일치'}
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !email ||
                  !password ||
                  (mode === 'signup' && (!passwordConfirm || password !== passwordConfirm))
                }
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#D4824A', color: '#FFFBF5' }}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : mode === 'signup' ? (
                  <UserPlus size={16} />
                ) : (
                  <LogIn size={16} />
                )}
                {mode === 'signup' ? '회원가입' : '로그인'}
              </button>
            </form>

            {/* 매직링크 + 게스트 옵션 */}
            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px" style={{ background: '#D4824A30' }} />
              <span className="text-xs opacity-50">다른 방법</span>
              <div className="flex-1 h-px" style={{ background: '#D4824A30' }} />
            </div>

            <div className="space-y-2">
              <button
                onClick={handleMagicLink}
                disabled={loading || !email}
                className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: '#FFFBF5',
                  color: '#3D2817',
                  border: '1.5px solid #D4824A30',
                }}
              >
                <Mail size={14} /> 비밀번호 없이 이메일로 로그인 (매직 링크)
              </button>

              <button
                onClick={handleAnonymous}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: '#FFFBF5',
                  color: '#3D2817',
                  border: '1.5px solid #D4824A30',
                }}
              >
                <User2 size={14} /> 게스트로 빠르게 시작
              </button>
            </div>

            <p className="text-[11px] opacity-60 text-center mt-4 leading-relaxed">
              {mode === 'signup'
                ? '회원가입하면 다른 기기에서도 같은 데이터를 볼 수 있어요'
                : '게스트 계정은 마이페이지에서 언제든 정식 회원으로 전환할 수 있어요'}
            </p>

            {info && (
              <div
                className="mt-3 p-3 rounded-xl text-xs"
                style={{ background: '#D4824A20', color: '#A35A2B' }}
              >
                {info}
              </div>
            )}
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

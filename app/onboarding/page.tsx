'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getMyProfile, updateMyProfile } from '@/lib/db/profile';
import { AVATAR_EMOJIS } from '@/lib/constants';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('나');
  const [emoji, setEmoji] = useState('🐻');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const profile = await getMyProfile(supabase);
      if (profile?.onboarded) router.push('/');
      if (profile) {
        setName(profile.name);
        setEmoji(profile.emoji);
      }
    })();
  }, [router]);

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      await updateMyProfile(supabase, { name: name.trim() || '나', emoji, onboarded: true });
      router.push('/');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center"
      style={{ background: '#F5EDE0' }}
    >
      <div
        className="relative w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: '430px', minHeight: '100vh', background: '#FAF4EB', color: '#3D2817' }}
      >
        {/* Progress */}
        <div className="flex items-center gap-2 p-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{ background: i <= step ? '#D4824A' : '#E8D5BC' }}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 animate-fade-in">
            <div className="mb-8 animate-float">
              <svg viewBox="0 0 200 200" className="w-48 h-48">
                <ellipse cx="100" cy="180" rx="70" ry="8" fill="#000" opacity="0.15" />
                <ellipse cx="100" cy="110" rx="70" ry="75" fill="#D4824A" />
                <ellipse cx="80" cy="90" rx="22" ry="30" fill="#FFFBF5" opacity="0.3" />
                <circle cx="75" cy="95" r="8" fill="#2B2017" />
                <circle cx="125" cy="95" r="8" fill="#2B2017" />
                <circle cx="77" cy="92" r="3" fill="#FFFBF5" />
                <circle cx="127" cy="92" r="3" fill="#FFFBF5" />
                <circle cx="55" cy="120" r="7" fill="#F5A894" opacity="0.7" />
                <circle cx="145" cy="120" r="7" fill="#F5A894" opacity="0.7" />
                <path d="M 85 130 Q 100 145 115 130" stroke="#2B2017" strokeWidth="4" fill="#8B3A3A" fillOpacity="0.4" strokeLinecap="round" />
                <text x="50" y="60" fontSize="20">✨</text>
                <text x="145" y="55" fontSize="18">✨</text>
              </svg>
            </div>
            <div className="text-center">
              <div className="text-[11px] font-bold opacity-60 mb-2 tracking-widest">CLEANMATE</div>
              <h1 className="text-2xl font-black mb-3 tracking-tight">
                혼자 하던 청소,
                <br />
                같이 하는 즐거움
              </h1>
              <p className="text-sm opacity-70 leading-relaxed mb-8">
                동거인과 서로 인증하며
                <br />
                청소 습관을 만들어가요
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-transform"
              style={{ background: '#D4824A', color: '#FFFBF5', boxShadow: '0 8px 24px rgba(212, 130, 74, 0.4)' }}
            >
              시작하기
            </button>
          </div>
        )}

        {/* Step 1: Concept */}
        {step === 1 && (
          <div className="flex-1 flex flex-col px-6 pb-8 animate-fade-in">
            <div className="text-center mt-4 mb-6">
              <h2 className="text-xl font-black mb-2">다른 앱과 뭐가 달라요?</h2>
              <p className="text-xs opacity-60">셀프 체크로 끝이 아니에요</p>
            </div>
            <div className="space-y-3 flex-1">
              <div className="rounded-2xl p-4 animate-slide-up" style={{ background: '#FFFBF5' }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#D4824A20' }}>
                    📸
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1">1. 청소하고 사진 찍기</div>
                    <div className="text-xs opacity-70 leading-relaxed">완료한 모습을 찰칵 📷</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl p-4 animate-slide-up" style={{ background: '#FFFBF5', animationDelay: '100ms' }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#D4824A20' }}>
                    🤝
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1">2. 파트너가 확인</div>
                    <div className="text-xs opacity-70 leading-relaxed">
                      <b>본인이 아닌 파트너가</b> OK해야 완료돼요
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl p-4 animate-slide-up" style={{ background: '#FFFBF5', animationDelay: '200ms' }}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: '#D4824A20' }}>
                    🏠
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1">3. 방이 실시간으로 변해요</div>
                    <div className="text-xs opacity-70 leading-relaxed">캐릭터도 슬퍼해요 😭</div>
                  </div>
                </div>
              </div>
              <div
                className="rounded-2xl p-4 mt-4 animate-slide-up"
                style={{ background: '#D4824A15', border: '1.5px solid #D4824A40', animationDelay: '300ms' }}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 mb-1" style={{ color: '#A35A2B' }}>
                  <Sparkles size={12} /> 이래서 달라요
                </div>
                <div className="text-xs leading-relaxed">
                  누가 얼마나 청소했는지 <b>데이터로 투명하게</b> 남아요 💪
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setStep(0)} className="py-4 px-5 rounded-2xl font-bold text-sm" style={{ background: '#D4824A15' }}>
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 rounded-2xl font-bold text-base"
                style={{ background: '#D4824A', color: '#FFFBF5', boxShadow: '0 8px 24px rgba(212, 130, 74, 0.4)' }}
              >
                알겠어요
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Profile */}
        {step === 2 && (
          <div className="flex-1 flex flex-col px-6 pb-8 animate-fade-in">
            <div className="text-center mt-4 mb-5">
              <h2 className="text-xl font-black mb-2">프로필을 만들어봐요</h2>
              <p className="text-xs opacity-60">파티원에게 보여질 이름과 아바타</p>
            </div>
            <div className="rounded-2xl p-4 mb-4" style={{ background: '#FFFBF5' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#D4824A20' }}>
                  {emoji}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 10))}
                  placeholder="내 이름"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm font-bold outline-none"
                  style={{ background: '#F5EDE0', color: '#3D2817', border: '1.5px solid #D4824A30' }}
                  maxLength={10}
                />
              </div>
              <div className="grid grid-cols-8 gap-1.5">
                {AVATAR_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className="aspect-square rounded-lg flex items-center justify-center text-base active:scale-90 transition-transform"
                    style={{
                      background: emoji === e ? '#D4824A' : '#D4824A15',
                      border: emoji === e ? '2px solid #A35A2B' : 'none',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: '#D4824A15', border: '1.5px solid #D4824A40' }}>
              <div className="text-xs font-bold mb-1" style={{ color: '#A35A2B' }}>💡 파트너 초대</div>
              <div className="text-xs leading-relaxed">
                설정에서 생성된 <b>초대 코드</b>를 파트너에게 공유하면 같은 파티에 함께할 수 있어요.
              </div>
            </div>
            {error && (
              <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: '#C46E5220', color: '#C46E52' }}>
                {error}
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setStep(1)} className="py-4 px-5 rounded-2xl font-bold text-sm" style={{ background: '#D4824A15' }}>
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleComplete}
                disabled={loading || !name.trim()}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#D4824A', color: '#FFFBF5', boxShadow: '0 8px 24px rgba(212, 130, 74, 0.4)' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : '✨'} 시작하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

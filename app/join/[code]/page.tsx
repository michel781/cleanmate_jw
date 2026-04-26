'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { joinPartyByInviteCode, getPartyByInviteCode } from '@/lib/db/party';
import type { Party } from '@/types/app';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string) ?? '';

  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const p = await getPartyByInviteCode(supabase, code);
      setParty(p);
      setLoading(false);
    })();
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/login?next=/join/${code}`);
        return;
      }
      await joinPartyByInviteCode(supabase, code);
      router.push('/');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EDE0' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#D4824A' }} />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#F5EDE0' }}>
        <div className="text-5xl mb-3">😕</div>
        <div className="text-lg font-bold mb-1">유효하지 않은 초대 코드</div>
        <div className="text-xs opacity-60">코드가 올바른지 확인해주세요</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#F5EDE0' }}>
      <div className="w-full max-w-sm text-center">
        <Users size={48} className="mx-auto mb-4" style={{ color: '#D4824A' }} />
        <div className="text-xs opacity-60 mb-1">파티 초대장</div>
        <h1 className="text-2xl font-black mb-1">{party.name}</h1>
        <div className="text-sm opacity-70 mb-6">
          초대 코드: <span className="font-mono font-bold">{party.invite_code}</span>
        </div>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: '#D4824A', color: '#FFFBF5' }}
        >
          {joining ? <Loader2 size={16} className="animate-spin" /> : '✨'}
          파티 참여하기
        </button>

        {error && (
          <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: '#C46E5220', color: '#C46E52' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

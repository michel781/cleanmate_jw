'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NewBadgesModal } from '@/components/modals/NewBadgesModal';
import { createClient } from '@/lib/supabase/client';
import { unlockBadges } from '@/lib/db/badges';
import { checkNewBadges } from '@/lib/domain/badges';
import { calculateScore, getStateFromScore } from '@/lib/domain/score';
import { getLevel } from '@/lib/domain/level';
import { BADGES, THEME } from '@/lib/constants';
import { useAppData, type AppData, type LoadOptions } from '@/hooks/useAppData';
import type {
  Profile, Verification, BadgeDefinition, RoomState, LevelInfo,
} from '@/types/app';

interface AppContextValue {
  data: AppData;
  reload: (opts?: LoadOptions) => Promise<AppData | null>;

  saving: boolean;
  showToast: (msg: string) => void;
  withSaving: (fn: () => Promise<void>) => Promise<void>;
  setApiError: (msg: string | null) => void;

  /** Run after a write that may unlock badges. Reloads + opens NewBadgesModal if any new ones earned. */
  checkBadgesAndNotify: () => Promise<void>;

  // Derived display tokens
  score: number;
  state: RoomState;
  theme: (typeof THEME)[RoomState];
  bgOuter: string;
  bgInner: string;
  cardBg: string;
  inputBg: string;

  // Derived data
  me: Profile;
  partner: Profile | undefined;
  pendingForMe: Verification[];
  sentByMe: Verification[];
  myScore: number;
  myLevel: LevelInfo;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppDataProvider');
  return ctx;
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { data, loading, error, reload } = useAppData();

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [newlyEarned, setNewlyEarned] = useState<BadgeDefinition[]>([]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const withSaving = useCallback(async (fn: () => Promise<void>) => {
    setSaving(true);
    setApiError(null);
    try { await fn(); }
    catch (e) {
      setApiError((e as Error).message);
      setTimeout(() => setApiError(null), 3500);
    } finally { setSaving(false); }
  }, []);

  const checkBadgesAndNotify = useCallback(async () => {
    const fresh = await reload();
    if (!fresh || !fresh.streak || !fresh.totals) return;
    const newIds = checkNewBadges({
      userTotals: fresh.totals,
      streak: fresh.streak,
      tasks: fresh.tasks,
      existingBadges: fresh.badges,
    });
    if (newIds.length === 0) return;
    const supabase = createClient();
    await unlockBadges(supabase, newIds, fresh.party.id);
    await reload();
    const defs = newIds
      .map((id) => BADGES.find((b) => b.id === id))
      .filter((b): b is BadgeDefinition => Boolean(b));
    if (defs.length > 0) setNewlyEarned(defs);
  }, [reload]);

  const score = useMemo(() => calculateScore(data?.tasks ?? []), [data?.tasks]);
  const state: RoomState = getStateFromScore(score);
  const theme = THEME[state];

  const bgOuter = state === 'critical' ? '#1A0F08' : state === 'dirty' ? '#5C4433' : '#F5EDE0';
  const bgInner = state === 'critical' ? '#241812' : state === 'dirty' ? '#4F3828' : '#FAF4EB';
  const cardBg = state === 'critical' || state === 'dirty' ? 'rgba(255, 251, 245, 0.08)' : '#FFFBF5';
  const inputBg = cardBg;

  const me = data?.profile;
  const partner = data?.members.find((m) => m.id !== data?.userId);

  const pendingForMe = useMemo(
    () => (data?.verifications ?? []).filter(
      (v) => v.status === 'pending' && v.requested_by !== data?.userId
    ),
    [data?.verifications, data?.userId]
  );
  const sentByMe = useMemo(
    () => (data?.verifications ?? []).filter(
      (v) => v.status === 'pending' && v.requested_by === data?.userId
    ),
    [data?.verifications, data?.userId]
  );

  const myScore = useMemo(
    () => data?.scores.find((s) => s.user_id === data?.userId)?.score ?? 0,
    [data?.scores, data?.userId]
  );
  const myLevel = useMemo(() => getLevel(myScore), [myScore]);

  if (loading) return <LoadingScreen message="CleanMate 불러오는 중..." />;
  if (error || !data || !me) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#F5EDE0' }}>
        <AlertCircle size={40} style={{ color: '#C46E52' }} />
        <div className="mt-3 text-sm text-center font-bold">{error ?? '데이터를 불러올 수 없어요'}</div>
        <button
          onClick={() => reload()}
          className="mt-4 px-4 py-2 rounded-xl text-sm font-bold"
          style={{ background: '#D4824A', color: '#FFFBF5' }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  const value: AppContextValue = {
    data, reload, saving, showToast, withSaving, setApiError, checkBadgesAndNotify,
    score, state, theme, bgOuter, bgInner, cardBg, inputBg,
    me, partner, pendingForMe, sentByMe, myScore, myLevel,
  };

  return (
    <AppContext.Provider value={value}>
      <div
        className="min-h-screen w-full flex flex-col items-center"
        style={{ background: bgOuter, transition: 'background 800ms ease-in-out' }}
      >
        {saving && (
          <div
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
            style={{ background: 'rgba(43,32,23,0.92)', color: '#F5EDE0', backdropFilter: 'blur(8px)' }}
          >
            <Loader2 size={12} className="animate-spin" /> 저장 중...
          </div>
        )}
        {toast && (
          <div
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold animate-bounce-in"
            style={{ background: 'rgba(43,32,23,0.92)', color: '#F5EDE0', backdropFilter: 'blur(8px)' }}
          >
            {toast}
          </div>
        )}
        {apiError && (
          <div
            className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
            style={{ background: '#C46E52', color: '#FFFBF5' }}
          >
            <AlertCircle size={14} /> {apiError}
          </div>
        )}

        <div
          className="relative w-full shadow-2xl overflow-hidden"
          style={{
            maxWidth: '430px',
            minHeight: '100vh',
            background: bgInner,
            color: theme.text,
            transition: 'all 800ms ease-in-out',
          }}
        >
          {children}
        </div>

        {newlyEarned.length > 0 && (
          <NewBadgesModal
            badges={newlyEarned}
            bgInner={bgInner}
            accent={theme.accent}
            accentDark={theme.accentDark}
            text={theme.text}
            onClose={() => setNewlyEarned([])}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lock, Save } from 'lucide-react';
import { useAppContext } from '../../AppDataProvider';
import { LivingRoom } from '@/components/LivingRoom';
import {
  ROOM_SOFAS, ROOM_RUGS, ROOM_PLANTS, ROOM_TABLES, ROOM_BOOKSHELVES, ROOM_EXTRAS,
} from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { updateMyProfile } from '@/lib/db/profile';
import type {
  RoomLayout, SofaVariant, RugVariant, PlantVariant, TableVariant, BookshelfVariant, RoomExtra,
} from '@/types/app';

type Tab = 'sofa' | 'rug' | 'plants' | 'table' | 'bookshelf' | 'extras';

export default function RoomLayoutPage() {
  const router = useRouter();
  const {
    state, theme: t, cardBg, me, data, saving, withSaving, reload, showToast,
  } = useAppContext();

  const [tab, setTab] = useState<Tab>('sofa');
  const [layout, setLayout] = useState<RoomLayout>(me.room_layout ?? {});
  const cleaningsApproved = data.totals?.approved_count ?? 0;

  function isLocked(unlock: { kind: string; value: number } | undefined): boolean {
    if (!unlock) return false;
    if (unlock.kind === 'cleanings') return cleaningsApproved < unlock.value;
    return false;
  }

  function togglePlant(p: PlantVariant) {
    setLayout((prev) => {
      const cur = prev.plants ?? [];
      if (cur.includes(p)) return { ...prev, plants: cur.filter((x) => x !== p) };
      if (cur.length >= 2) return { ...prev, plants: [cur[1], p] };
      return { ...prev, plants: [...cur, p] };
    });
  }

  function toggleExtra(e: RoomExtra) {
    setLayout((prev) => {
      const cur = prev.extras ?? [];
      return cur.includes(e)
        ? { ...prev, extras: cur.filter((x) => x !== e) }
        : { ...prev, extras: [...cur, e] };
    });
  }

  async function handleSave() {
    await withSaving(async () => {
      const supabase = createClient();
      await updateMyProfile(supabase, { room_layout: layout });
      await reload();
      showToast('방이 저장됐어요');
      router.push('/me');
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'sofa', label: '소파' },
    { id: 'rug', label: '러그' },
    { id: 'plants', label: '화분' },
    { id: 'table', label: '테이블' },
    { id: 'bookshelf', label: '책장' },
    { id: 'extras', label: '기타' },
  ];

  return (
    <div className="animate-fade-in pb-32">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/me')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div className="font-bold text-base">방 꾸미기</div>
      </div>

      <div className="px-5 mb-3">
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg }}>
          <LivingRoom state={state} appearance={me.appearance} layout={layout} reduced />
        </div>
      </div>

      <div className="px-5">
        <div className="flex gap-1.5 p-1 rounded-xl mb-3 overflow-x-auto" style={{ background: `${t.accent}10` }}>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap"
              style={{
                background: tab === tb.id ? t.accent : 'transparent',
                color: tab === tb.id ? '#FFFBF5' : t.text,
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'sofa' && (
          <Grid>
            {ROOM_SOFAS.map((s) => {
              const locked = isLocked('unlock' in s ? s.unlock : undefined);
              return (
                <Card key={s.id}
                  selected={(layout.sofa ?? 'small') === s.id}
                  onClick={() => !locked && setLayout((p) => ({ ...p, sofa: s.id as SofaVariant }))}
                  accent={t.accent}
                  label={s.label}
                  locked={locked}
                  lockedHint={locked && 'unlock' in s ? `청소 ${s.unlock!.value}회` : undefined}
                  emoji="🛋️"
                />
              );
            })}
          </Grid>
        )}
        {tab === 'rug' && (
          <Grid>
            {ROOM_RUGS.map((r) => {
              const locked = isLocked('unlock' in r ? r.unlock : undefined);
              return (
                <Card key={r.id}
                  selected={(layout.rug ?? 'round') === r.id}
                  onClick={() => !locked && setLayout((p) => ({ ...p, rug: r.id as RugVariant }))}
                  accent={t.accent}
                  label={r.label}
                  locked={locked}
                  lockedHint={locked && 'unlock' in r ? `청소 ${r.unlock!.value}회` : undefined}
                  emoji="🟢"
                />
              );
            })}
          </Grid>
        )}
        {tab === 'plants' && (
          <>
            <p className="text-[11px] opacity-60 mb-2">최대 2개까지 선택할 수 있어요</p>
            <Grid>
              {ROOM_PLANTS.map((p) => {
                const locked = isLocked('unlock' in p ? p.unlock : undefined);
                const selected = (layout.plants ?? ['monstera', 'cactus']).includes(p.id as PlantVariant);
                return (
                  <Card key={p.id}
                    selected={selected}
                    onClick={() => !locked && togglePlant(p.id as PlantVariant)}
                    accent={t.accent}
                    label={p.label}
                    locked={locked}
                    lockedHint={locked && 'unlock' in p ? `청소 ${p.unlock!.value}회` : undefined}
                    emoji={p.id === 'cactus' ? '🌵' : p.id === 'tree' ? '🌸' : '🌿'}
                  />
                );
              })}
            </Grid>
          </>
        )}
        {tab === 'table' && (
          <Grid>
            {ROOM_TABLES.map((tb) => (
              <Card key={tb.id}
                selected={(layout.table ?? 'round') === tb.id}
                onClick={() => setLayout((p) => ({ ...p, table: tb.id as TableVariant }))}
                accent={t.accent}
                label={tb.label}
                emoji="🪑"
              />
            ))}
          </Grid>
        )}
        {tab === 'bookshelf' && (
          <Grid>
            {ROOM_BOOKSHELVES.map((b) => {
              const locked = isLocked('unlock' in b ? b.unlock : undefined);
              return (
                <Card key={b.id}
                  selected={(layout.bookshelf ?? 'rect') === b.id}
                  onClick={() => !locked && setLayout((p) => ({ ...p, bookshelf: b.id as BookshelfVariant }))}
                  accent={t.accent}
                  label={b.label}
                  locked={locked}
                  lockedHint={locked && 'unlock' in b ? `청소 ${b.unlock!.value}회` : undefined}
                  emoji="📚"
                />
              );
            })}
          </Grid>
        )}
        {tab === 'extras' && (
          <Grid>
            {ROOM_EXTRAS.map((e) => {
              const locked = isLocked('unlock' in e ? e.unlock : undefined);
              const selected = (layout.extras ?? []).includes(e.id as RoomExtra);
              const emojiMap: Record<string, string> = {
                fishbowl: '🐠', catbed: '🐱', console: '🎮', whiteboard: '📋', calendar: '📅',
              };
              return (
                <Card key={e.id}
                  selected={selected}
                  onClick={() => !locked && toggleExtra(e.id as RoomExtra)}
                  accent={t.accent}
                  label={e.label}
                  locked={locked}
                  lockedHint={locked && 'unlock' in e ? `청소 ${e.unlock!.value}회` : undefined}
                  emoji={emojiMap[e.id]}
                />
              );
            })}
          </Grid>
        )}

        <div className="mt-4 rounded-xl p-3" style={{ background: `${t.accent}10` }}>
          <div className="text-[11px] font-bold opacity-70">총 청소 인증 횟수</div>
          <div className="text-2xl font-black" style={{ color: t.accent }}>{cleaningsApproved}회</div>
          <div className="text-[10px] opacity-60 mt-1">청소를 완료할수록 새 가구가 잠금 해제돼요</div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5" style={{ background: `linear-gradient(to top, ${cardBg}, transparent)` }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full max-w-[420px] mx-auto py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: t.accent, color: '#FFFBF5', boxShadow: `0 8px 24px ${t.accent}50`, display: 'flex' }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          저장하기
        </button>
      </div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-3 gap-2">{children}</div>;
}

function Card({
  selected, onClick, accent, label, emoji, locked, lockedHint,
}: {
  selected: boolean;
  onClick: () => void;
  accent: string;
  label: string;
  emoji?: string;
  locked?: boolean;
  lockedHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className="relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 disabled:cursor-not-allowed"
      style={{
        background: selected ? `${accent}30` : `${accent}10`,
        border: selected ? `2px solid ${accent}` : '2px solid transparent',
        opacity: locked ? 0.55 : 1,
      }}
    >
      <div className="text-2xl">{emoji}</div>
      <div className="text-[10px] font-bold opacity-80">{label}</div>
      {locked && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded" style={{ background: '#3D2817', color: '#FFFBF5' }}>
          <Lock size={9} /> {lockedHint}
        </div>
      )}
    </button>
  );
}

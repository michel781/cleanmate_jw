'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lock, Save } from 'lucide-react';
import { useAppContext } from '../../AppDataProvider';
import { Character } from '@/components/Character';
import {
  CHARACTER_COLORS,
  CHARACTER_HATS,
  CHARACTER_SHIRTS,
  CHARACTER_ACCESSORIES,
} from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { updateMyProfile } from '@/lib/db/profile';
import type {
  Appearance, CharacterColor, CharacterHat, CharacterShirt, CharacterAccessory,
} from '@/types/app';

type Tab = 'color' | 'hat' | 'shirt' | 'accessory';

export default function AppearancePage() {
  const router = useRouter();
  const {
    theme: t, cardBg, me, data, myLevel, saving, withSaving, reload, showToast,
  } = useAppContext();

  const [tab, setTab] = useState<Tab>('color');
  const [appearance, setAppearance] = useState<Appearance>(me.appearance ?? {});

  const level = myLevel.level;
  const cleaningsApproved = data.totals?.approved_count ?? 0;

  function isLocked(unlock: { kind: string; value: number } | undefined): boolean {
    if (!unlock) return false;
    if (unlock.kind === 'level') return level < unlock.value;
    if (unlock.kind === 'cleanings') return cleaningsApproved < unlock.value;
    return false;
  }

  async function handleSave() {
    await withSaving(async () => {
      const supabase = createClient();
      await updateMyProfile(supabase, { appearance });
      await reload();
      showToast('캐릭터가 저장됐어요');
      router.push('/me');
    });
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'color', label: '색상' },
    { id: 'hat', label: '모자' },
    { id: 'shirt', label: '옷' },
    { id: 'accessory', label: '액세서리' },
  ];

  return (
    <div className="animate-fade-in pb-32">
      <div className="flex items-center gap-3 p-5">
        <button onClick={() => router.push('/me')} className="p-2 rounded-xl" style={{ background: `${t.accent}15` }}>
          <ArrowLeft size={18} />
        </button>
        <div className="font-bold text-base">내 캐릭터 꾸미기</div>
      </div>

      <div className="grid grid-cols-5 gap-3 px-5">
        {/* Preview (40%) */}
        <div className="col-span-2 rounded-2xl flex items-center justify-center" style={{ background: cardBg, aspectRatio: '1/1' }}>
          <svg viewBox="0 0 200 240" className="w-full h-full">
            <Character state="ok" x={100} y={140} appearance={appearance} scale={1.6} reduced />
          </svg>
        </div>

        {/* Picker (60%) */}
        <div className="col-span-3 space-y-3">
          <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: `${t.accent}10` }}>
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-bold"
                style={{
                  background: tab === tb.id ? t.accent : 'transparent',
                  color: tab === tb.id ? '#FFFBF5' : t.text,
                }}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {tab === 'color' && (
            <Grid>
              {CHARACTER_COLORS.map((c) => (
                <OptionCard
                  key={c.id}
                  selected={(appearance.color ?? 'brown') === c.id}
                  onClick={() => setAppearance((a) => ({ ...a, color: c.id as CharacterColor }))}
                  accent={t.accent}
                  label={c.label}
                >
                  <div className="w-7 h-7 rounded-full" style={{ background: c.fill, border: `2px solid ${c.dark}` }} />
                </OptionCard>
              ))}
            </Grid>
          )}

          {tab === 'hat' && (
            <Grid>
              {CHARACTER_HATS.map((h) => {
                const locked = isLocked('unlock' in h ? h.unlock : undefined);
                return (
                  <OptionCard
                    key={h.id}
                    selected={(appearance.hat ?? 'none') === h.id}
                    onClick={() => !locked && setAppearance((a) => ({ ...a, hat: h.id as CharacterHat }))}
                    accent={t.accent}
                    label={h.label}
                    locked={locked}
                    lockedHint={locked && 'unlock' in h ? `Lv.${h.unlock!.value}+` : undefined}
                  >
                    <HatPreviewSwatch hat={h.id as CharacterHat} accent={t.accent} />
                  </OptionCard>
                );
              })}
            </Grid>
          )}

          {tab === 'shirt' && (
            <Grid>
              {CHARACTER_SHIRTS.map((s) => {
                const locked = isLocked('unlock' in s ? s.unlock : undefined);
                return (
                  <OptionCard
                    key={s.id}
                    selected={(appearance.shirt ?? 'none') === s.id}
                    onClick={() => !locked && setAppearance((a) => ({ ...a, shirt: s.id as CharacterShirt }))}
                    accent={t.accent}
                    label={s.label}
                    locked={locked}
                    lockedHint={locked && 'unlock' in s ? `Lv.${s.unlock!.value}+` : undefined}
                  >
                    <ShirtPreviewSwatch shirt={s.id as CharacterShirt} />
                  </OptionCard>
                );
              })}
            </Grid>
          )}

          {tab === 'accessory' && (
            <Grid>
              {CHARACTER_ACCESSORIES.map((ac) => (
                <OptionCard
                  key={ac.id}
                  selected={(appearance.accessory ?? 'none') === ac.id}
                  onClick={() => setAppearance((a) => ({ ...a, accessory: ac.id as CharacterAccessory }))}
                  accent={t.accent}
                  label={ac.label}
                >
                  <span className="text-lg">
                    {ac.id === 'none' ? '—' : ac.id === 'scarf' ? '🧣' : ac.id === 'glasses' ? '👓' : ac.id === 'ribbon' ? '🎀' : '🌸'}
                  </span>
                </OptionCard>
              ))}
            </Grid>
          )}
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

function OptionCard({
  selected, onClick, accent, label, locked, lockedHint, children,
}: {
  selected: boolean;
  onClick: () => void;
  accent: string;
  label: string;
  locked?: boolean;
  lockedHint?: string;
  children: React.ReactNode;
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
      <div className="flex items-center justify-center" style={{ height: 32 }}>{children}</div>
      <div className="text-[10px] font-bold opacity-80">{label}</div>
      {locked && (
        <div className="absolute top-1 right-1 flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded" style={{ background: '#3D2817', color: '#FFFBF5' }}>
          <Lock size={9} /> {lockedHint}
        </div>
      )}
    </button>
  );
}

function HatPreviewSwatch({ hat, accent }: { hat: CharacterHat; accent: string }) {
  if (hat === 'none') return <span className="text-base opacity-60">—</span>;
  const map: Record<Exclude<CharacterHat, 'none'>, string> = {
    beanie: '🧢', beret: '🎨', cap: '🧢', crown: '👑', bunny: '🐰', headphones: '🎧',
  };
  return <span className="text-lg">{map[hat as Exclude<CharacterHat, 'none'>] ?? '?'}</span>;
}

function ShirtPreviewSwatch({ shirt }: { shirt: CharacterShirt }) {
  const map: Record<CharacterShirt, string> = {
    none: '—', stripe: '👕', hoodie: '🧥', overalls: '🧑‍🌾', cardigan: '🧥', pajamas: '🌙', suit: '🤵',
  };
  return <span className="text-lg">{map[shirt]}</span>;
}

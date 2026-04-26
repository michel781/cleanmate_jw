import { describe, it, expect } from 'vitest';
import { updateStreakOnActivity, todayISO } from '@/lib/domain/streak';
import type { Streak } from '@/types/app';

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDateDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * DAY_MS);
  return d.toISOString().split('T')[0];
}

function makeStreak(overrides: Partial<Streak> = {}): Streak {
  return {
    party_id: 'p1',
    current: 0,
    longest: 0,
    last_active_date: null,
    freezes: 2,
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('updateStreakOnActivity', () => {
  it('returns unchanged when already active today', () => {
    const s = makeStreak({ current: 5, longest: 10, last_active_date: todayISO() });
    expect(updateStreakOnActivity(s)).toBe(s);
  });

  it('starts streak at 1 on first activity', () => {
    const s = makeStreak({ current: 0, longest: 0, last_active_date: null });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(1);
    expect(next.last_active_date).toBe(todayISO());
  });

  it('preserves longest when starting fresh after a higher historical longest', () => {
    const s = makeStreak({ current: 0, longest: 30, last_active_date: null });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(1);
    expect(next.longest).toBe(30);
  });

  it('increments by 1 when active yesterday', () => {
    const s = makeStreak({
      current: 5,
      longest: 5,
      last_active_date: isoDateDaysAgo(1),
    });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(6);
    expect(next.longest).toBe(6);
  });

  it('does not lower longest when current passes it', () => {
    const s = makeStreak({
      current: 4,
      longest: 99,
      last_active_date: isoDateDaysAgo(1),
    });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(5);
    expect(next.longest).toBe(99);
  });

  it('uses a freeze when 2-day gap with freezes available', () => {
    const s = makeStreak({
      current: 7,
      longest: 7,
      freezes: 2,
      last_active_date: isoDateDaysAgo(2),
    });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(7);
    expect(next.freezes).toBe(1);
    expect(next.last_active_date).toBe(todayISO());
  });

  it('uses a freeze for 3-day gap (boundary)', () => {
    const s = makeStreak({
      current: 10,
      longest: 10,
      freezes: 1,
      last_active_date: isoDateDaysAgo(3),
    });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(10);
    expect(next.freezes).toBe(0);
  });

  it('resets to 1 on a 4-day gap even with freezes available', () => {
    const s = makeStreak({
      current: 10,
      longest: 10,
      freezes: 5,
      last_active_date: isoDateDaysAgo(4),
    });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(1);
    expect(next.freezes).toBe(5);
  });

  it('resets to 1 when out of freezes and gap > 1', () => {
    const s = makeStreak({
      current: 7,
      longest: 7,
      freezes: 0,
      last_active_date: isoDateDaysAgo(2),
    });
    const next = updateStreakOnActivity(s);
    expect(next.current).toBe(1);
    expect(next.freezes).toBe(0);
  });
});

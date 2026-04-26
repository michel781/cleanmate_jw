import { describe, it, expect } from 'vitest';
import { calculateScore, getStateFromScore, getDaysSince } from '@/lib/domain/score';
import type { Task } from '@/types/app';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    party_id: 'p1',
    name: 'task',
    emoji: '🧹',
    cycle: 7,
    weight: 10,
    assigned_to: null,
    last_done_at: null,
    last_done_by: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString();
}

describe('calculateScore', () => {
  it('returns 100 for empty task list', () => {
    expect(calculateScore([])).toBe(100);
  });

  it('returns 100 when all tasks are well within their cycle', () => {
    const tasks = [makeTask({ cycle: 7, last_done_at: isoDaysAgo(3) })];
    expect(calculateScore(tasks)).toBe(100);
  });

  it('returns 100 right at the 80% threshold (no penalty applied)', () => {
    // 80% of 7 days = 5.6 days. Use 5 days to stay strictly under.
    const tasks = [makeTask({ cycle: 7, last_done_at: isoDaysAgo(5) })];
    expect(calculateScore(tasks)).toBe(100);
  });

  it('applies penalty when ratio exceeds 0.8', () => {
    // 8 days since last done, cycle 7 → ratio ~1.14 → penalty (1.14-0.8)*10*6 ≈ 20.6
    const tasks = [makeTask({ cycle: 7, weight: 10, last_done_at: isoDaysAgo(8) })];
    const score = calculateScore(tasks);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(60);
  });

  it('weights heavier tasks more in the penalty', () => {
    const heavy = [makeTask({ weight: 20, cycle: 7, last_done_at: isoDaysAgo(14) })];
    const light = [makeTask({ weight: 5, cycle: 7, last_done_at: isoDaysAgo(14) })];
    expect(calculateScore(heavy)).toBeLessThan(calculateScore(light));
  });

  it('clamps to 0 for very overdue tasks', () => {
    const tasks = [
      makeTask({ id: 't1', cycle: 7, weight: 20, last_done_at: isoDaysAgo(60) }),
      makeTask({ id: 't2', cycle: 7, weight: 20, last_done_at: isoDaysAgo(60) }),
    ];
    expect(calculateScore(tasks)).toBe(0);
  });

  it('treats null last_done_at as ancient (max penalty)', () => {
    const tasks = [makeTask({ last_done_at: null })];
    expect(calculateScore(tasks)).toBe(0);
  });
});

describe('getStateFromScore', () => {
  it.each([
    [100, 'clean'],
    [85, 'clean'],
    [84, 'ok'],
    [60, 'ok'],
    [59, 'dirty'],
    [35, 'dirty'],
    [34, 'critical'],
    [0, 'critical'],
  ])('score=%i → %s', (score, expected) => {
    expect(getStateFromScore(score)).toBe(expected);
  });
});

describe('getDaysSince', () => {
  it('returns 999 for null', () => {
    expect(getDaysSince(null)).toBe(999);
  });

  it('returns 0 for now', () => {
    expect(getDaysSince(new Date().toISOString())).toBe(0);
  });

  it('returns ~3 for 3 days ago', () => {
    expect(getDaysSince(isoDaysAgo(3))).toBe(3);
  });
});

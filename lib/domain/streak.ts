import { DAY_MS } from '@/lib/constants';
import type { Streak } from '@/types/app';

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Update streak based on today's activity.
 * Returns new streak object (does NOT mutate input).
 *
 * Logic:
 * - If already active today: no change
 * - If active yesterday: +1
 * - If missed 2-3 days with freezes: use freeze
 * - Otherwise: reset to 1
 */
export function updateStreakOnActivity(streak: Streak): Streak {
  const today = todayISO();
  if (streak.last_active_date === today) return streak;

  if (!streak.last_active_date) {
    return { ...streak, current: 1, last_active_date: today, longest: Math.max(streak.longest, 1) };
  }

  const lastDate = new Date(streak.last_active_date + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / DAY_MS);

  if (diffDays === 1) {
    const next = streak.current + 1;
    return { ...streak, current: next, last_active_date: today, longest: Math.max(streak.longest, next) };
  } else if (diffDays > 1 && streak.freezes > 0 && diffDays <= 3) {
    return { ...streak, freezes: streak.freezes - 1, last_active_date: today };
  } else if (diffDays > 1) {
    return { ...streak, current: 1, last_active_date: today };
  }
  return streak;
}

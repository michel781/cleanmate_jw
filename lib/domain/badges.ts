import { BADGES } from '@/lib/constants';
import type { UserBadge, UserTotals, Streak, Task } from '@/types/app';
import { calculateScore } from './score';

export interface BadgeCheckContext {
  userTotals: UserTotals;
  streak: Streak;
  tasks: Task[];
  existingBadges: UserBadge[];
  now?: Date;
}

/**
 * Check which new badges the user just earned.
 * Returns the badge_ids that are newly unlocked.
 */
export function checkNewBadges(ctx: BadgeCheckContext): string[] {
  const { userTotals, streak, tasks, existingBadges, now = new Date() } = ctx;
  const unlocked = new Set(existingBadges.map((b) => b.badge_id));
  const score = calculateScore(tasks);
  const hour = now.getHours();
  const newBadges: string[] = [];

  const check = (id: string, cond: boolean) => {
    if (cond && !unlocked.has(id)) newBadges.push(id);
  };

  check('first_request', userTotals.requested_count >= 1);
  check('first_approval', userTotals.approved_count >= 1);
  check('streak_7', streak.current >= 7);
  check('streak_30', streak.current >= 30);
  check('cleanings_10', userTotals.approved_count >= 10);
  check('cleanings_50', userTotals.approved_count >= 50);
  check('perfect_clean', score >= 100);
  check('late_night', hour >= 0 && hour < 6 && userTotals.requested_count >= 1);

  return newBadges;
}

export function getBadgeMeta(badgeId: string) {
  return BADGES.find((b) => b.id === badgeId);
}

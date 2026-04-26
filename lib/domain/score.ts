import { DAY_MS } from '@/lib/constants';
import type { RoomState, Task } from '@/types/app';

export function getDaysSince(lastDoneAt: string | null): number {
  if (!lastDoneAt) return 999;
  return Math.floor((Date.now() - new Date(lastDoneAt).getTime()) / DAY_MS);
}

/**
 * Calculate room cleanliness score from task list.
 * 100 = perfectly clean. 0 = disaster.
 * Penalty applies when a task is over 80% of its cycle time since last done.
 */
export function calculateScore(tasks: Task[]): number {
  if (tasks.length === 0) return 100;
  let penalty = 0;
  for (const task of tasks) {
    const daysSince = getDaysSince(task.last_done_at);
    const ratio = daysSince / task.cycle;
    if (ratio > 0.8) {
      penalty += (ratio - 0.8) * task.weight * 6;
    }
  }
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function getStateFromScore(score: number): RoomState {
  if (score >= 85) return 'clean';
  if (score >= 60) return 'ok';
  if (score >= 35) return 'dirty';
  return 'critical';
}

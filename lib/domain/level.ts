import { LEVEL_THRESHOLDS, LEVEL_TITLES } from '@/lib/constants';
import type { LevelInfo } from '@/types/app';

export function getLevel(xp: number): LevelInfo {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      const nextThreshold = LEVEL_THRESHOLDS[i + 1] ?? null;
      return {
        level: i + 1,
        title: LEVEL_TITLES[i],
        currentXP: xp - LEVEL_THRESHOLDS[i],
        requiredXP: nextThreshold ? nextThreshold - LEVEL_THRESHOLDS[i] : null,
        nextThreshold,
      };
    }
  }
  return {
    level: 1,
    title: LEVEL_TITLES[0],
    currentXP: xp,
    requiredXP: LEVEL_THRESHOLDS[1],
    nextThreshold: LEVEL_THRESHOLDS[1],
  };
}

import { describe, it, expect } from 'vitest';
import { getLevel } from '@/lib/domain/level';

// LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1500, 3000, 5000]
// Level i+1 starts at LEVEL_THRESHOLDS[i].

describe('getLevel', () => {
  it('xp=0 is level 1', () => {
    const info = getLevel(0);
    expect(info.level).toBe(1);
    expect(info.title).toBe('청소 새싹');
    expect(info.currentXP).toBe(0);
    expect(info.requiredXP).toBe(50);
  });

  it('xp=49 is still level 1', () => {
    expect(getLevel(49).level).toBe(1);
  });

  it('xp=50 promotes to level 2', () => {
    const info = getLevel(50);
    expect(info.level).toBe(2);
    expect(info.title).toBe('청소 초보');
    expect(info.currentXP).toBe(0);
    expect(info.requiredXP).toBe(100); // 150 - 50
  });

  it('xp=149 still level 2', () => {
    expect(getLevel(149).level).toBe(2);
  });

  it('xp=150 promotes to level 3', () => {
    expect(getLevel(150).level).toBe(3);
  });

  it('mid-level currentXP is correct', () => {
    // 700 = level 5 start, 1500 = level 6. So xp=900 is level 5 + 200 currentXP.
    const info = getLevel(900);
    expect(info.level).toBe(5);
    expect(info.currentXP).toBe(200);
    expect(info.requiredXP).toBe(800); // 1500 - 700
  });

  it('returns max level (8) for xp at top threshold', () => {
    const info = getLevel(5000);
    expect(info.level).toBe(8);
    expect(info.title).toBe('청소의 신');
    expect(info.requiredXP).toBeNull();
    expect(info.nextThreshold).toBeNull();
  });

  it('caps at level 8 for xp far above the top threshold', () => {
    const info = getLevel(99999);
    expect(info.level).toBe(8);
    expect(info.requiredXP).toBeNull();
  });
});

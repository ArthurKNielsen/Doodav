import { describe, expect, it } from 'vitest';
import { formatDuration, groupByDay, withinDays } from './format';

describe('formatDuration', () => {
  it('shows milliseconds, seconds, and minutes', () => {
    expect(formatDuration(500)).toBe('500 ms');
    expect(formatDuration(38200)).toBe('38.2 s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

describe('groupByDay', () => {
  const now = new Date(2026, 9, 13, 12).getTime();
  it('labels today, yesterday, and older days, newest first', () => {
    const items = [
      { createdAt: new Date(2026, 9, 13, 9).getTime(), id: 'a' },
      { createdAt: new Date(2026, 9, 13, 8).getTime(), id: 'b' },
      { createdAt: new Date(2026, 9, 12, 20).getTime(), id: 'c' },
      { createdAt: new Date(2026, 9, 1, 10).getTime(), id: 'd' },
    ];
    const groups = groupByDay(items, now);
    expect(groups.map((g) => g.label)[0]).toBe('Today');
    expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(groups[1].label).toBe('Yesterday');
    expect(groups).toHaveLength(3);
  });
});

describe('withinDays', () => {
  it('counts a rolling window', () => {
    const now = Date.now();
    expect(withinDays(now - 6 * 86400000, now, 7)).toBe(true);
    expect(withinDays(now - 8 * 86400000, now, 7)).toBe(false);
  });
});

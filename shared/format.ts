// Small pure helpers for times and history grouping. Shared so they can be unit-tested.

const DAY_MS = 24 * 60 * 60 * 1000;

/** 38200 -> "38.2 s", 500 -> "500 ms", 125000 -> "2m 5s". */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

/** Local midnight at the start of the day containing `ts`. */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "Today", "Yesterday", or a readable date. */
export function dayLabel(ts: number, now: number): string {
  const day = startOfDay(ts);
  if (day === startOfDay(now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === startOfDay(yesterday.getTime())) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

/** Groups items by day, newest first, keeping the input order inside each group. */
export function groupByDay<T extends { createdAt: number }>(items: T[], now: number): Array<{ label: string; items: T[] }> {
  const groups: Array<{ label: string; items: T[] }> = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

/** True if `ts` is within the last `days` days (rolling, not calendar). */
export function withinDays(ts: number, now: number, days: number): boolean {
  return now - ts < days * DAY_MS;
}

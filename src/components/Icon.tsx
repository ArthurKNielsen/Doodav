type IconName =
  | 'home' | 'clock' | 'scan' | 'chat' | 'user' | 'search' | 'back'
  | 'up' | 'plus' | 'right' | 'sun' | 'moon' | 'more' | 'image';

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

const ICONS: Record<IconName, string[]> = {
  home: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  clock: [circle(12, 12, 9), 'M12 7v5l3 2'],
  scan: ['M4 8V6a2 2 0 0 1 2-2h2', 'M16 4h2a2 2 0 0 1 2 2v2', 'M20 16v2a2 2 0 0 1-2 2h-2', 'M8 20H6a2 2 0 0 1-2-2v-2', 'M4 12h16'],
  chat: ['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z'],
  user: [circle(12, 8, 4), 'M4 21a8 8 0 0 1 16 0'],
  search: [circle(11, 11, 7), 'M21 21l-4.3-4.3'],
  back: ['M15 18l-6-6 6-6'],
  up: ['M12 19V5', 'M5 12l7-7 7 7'],
  plus: ['M12 5v14', 'M5 12h14'],
  right: ['M5 12h14', 'M13 6l6 6-6 6'],
  sun: [circle(12, 12, 4), 'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
  moon: ['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  image: ['M4 4h16v16H4z', 'M4 17l5-5 4 4 3-3 4 4', circle(9, 9, 1.5)],
};

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function Mark({ size = 36 }: { size?: number }) {
  return (
    <span className="mark" style={{ width: size, height: size }} aria-hidden="true">
      <Icon name="scan" size={Math.round(size * 0.55)} />
    </span>
  );
}

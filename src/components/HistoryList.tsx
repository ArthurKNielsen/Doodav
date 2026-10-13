// The History screen: Today / Week / All filter, search, and day-grouped rows.
import { useMemo, useState } from 'react';
import { matchesQuery, type ScanRecord } from '../lib/history';
import { groupByDay, withinDays } from '../../shared/format';
import { Icon } from './Icon';

interface Props {
  records: ScanRecord[];
  onOpen: (id: string) => void;
  onClearAll: () => void;
}

type Range = 'today' | 'week' | 'all';
const RANGES: Array<{ id: Range; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'all', label: 'All' },
];

function timeOf(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function HistoryList({ records, onOpen, onClearAll }: Props) {
  const [range, setRange] = useState<Range>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const now = Date.now();

  const visible = useMemo(() => {
    const byRange = records.filter((r) => {
      if (range === 'all') return true;
      if (range === 'week') return withinDays(r.createdAt, now, 7);
      return withinDays(r.createdAt, now, 1);
    });
    return byRange.filter((r) => matchesQuery(r, query));
  }, [records, range, query, now]);

  const groups = useMemo(() => groupByDay(visible, now), [visible, now]);
  const weekCount = records.filter((r) => withinDays(r.createdAt, now, 7)).length;

  if (records.length === 0) {
    return (
      <div className="empty card">
        <p className="eyebrow">History</p>
        <p>No scans yet.</p>
        <p className="muted">Everything you scan shows up here.</p>
      </div>
    );
  }

  return (
    <section className="history">
      <div className="history__head">
        <div>
          <p className="muted small">{weekCount} scans this week</p>
          <h2 className="screen-title">History</h2>
        </div>
        <button
          className="round-btn"
          aria-label={searching ? 'Close search' : 'Search history'}
          aria-expanded={searching}
          onClick={() => {
            setSearching((s) => !s);
            setQuery('');
          }}
        >
          <Icon name="search" size={20} />
        </button>
      </div>

      {searching && (
        <>
          <label className="sr-only" htmlFor="history-search">
            Search history
          </label>
          <input
            id="history-search"
            className="input"
            type="search"
            autoFocus
            placeholder="Search by name, category, or fact"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </>
      )}

      <div className="segmented" role="group" aria-label="Show">
        {RANGES.map((r) => (
          <button key={r.id} className="segmented__item" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="muted center">{query ? `Nothing matches “${query}”.` : 'No scans in this range.'}</p>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="history__group">
            <div className="history__day">
              <span className="eyebrow">{group.label}</span>
              <span className="eyebrow">{group.items.length} items</span>
            </div>
            <ul className="history__list">
              {group.items.map((r) => (
                <li key={r.id}>
                  <button className="row" onClick={() => onOpen(r.id)}>
                    <span className="row__icon" aria-hidden="true">
                      {r.item.source === 'barcode' ? <span className="ean">EAN</span> : <Icon name="scan" size={20} />}
                    </span>
                    <span className="row__text">
                      <span className="row__name">{r.item.name}</span>
                      <span className="muted small">
                        {[r.item.category, timeOf(r.createdAt)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="row__score muted small">
                      {r.item.source === 'barcode' ? 'Exact' : r.item.confidence ?? ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <button
        className="btn btn--danger-ghost"
        onClick={() => {
          if (window.confirm('Delete all saved scans? This cannot be undone.')) onClearAll();
        }}
      >
        Clear all history
      </button>
    </section>
  );
}

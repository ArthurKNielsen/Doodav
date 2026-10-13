// Browsable, searchable list of past scans.
import { useMemo, useState } from 'react';
import { matchesQuery, type ScanRecord } from '../lib/history';

interface Props {
  records: ScanRecord[];
  onOpen: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryList({ records, onOpen, onClearAll }: Props) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => records.filter((r) => matchesQuery(r, query)), [records, query]);

  if (records.length === 0) {
    return (
      <div className="empty">
        <p>No scans yet.</p>
        <p className="muted">Everything you scan shows up here.</p>
      </div>
    );
  }

  return (
    <section className="history">
      <label className="sr-only" htmlFor="history-search">
        Search history
      </label>
      <input
        id="history-search"
        className="input"
        type="search"
        placeholder="Search by name, category, or fact"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <p className="muted history__count">
        {visible.length} of {records.length} scans
      </p>

      {visible.length === 0 ? (
        <p className="muted">Nothing matches “{query}”.</p>
      ) : (
        <ul className="history__list">
          {visible.map((r) => (
            <li key={r.id}>
              <button className="history__row" onClick={() => onOpen(r.id)}>
                {r.thumbnail ? (
                  <img className="history__thumb" src={r.thumbnail} alt="" />
                ) : (
                  <span className="history__thumb history__thumb--empty" aria-hidden="true">?</span>
                )}
                <span className="history__text">
                  <span className="history__name">{r.item.name}</span>
                  <span className="muted">
                    {[r.item.category, new Date(r.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
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

// App shell: header, the Scan / History tabs, and the info card view.
import { useEffect, useState } from 'react';
import { checkHealth, type Health } from './lib/api';
import { loadHistory, MAX_RECORDS, newRecordId, saveHistory, type ScanRecord } from './lib/history';
import { useTheme } from './lib/theme';
import type { AskTurn, ScanItem } from '../shared/types';
import { HistoryList } from './components/HistoryList';
import { InfoCard } from './components/InfoCard';
import { Scanner } from './components/Scanner';

type Tab = 'scan' | 'history';

export default function App() {
  const { theme, toggle } = useTheme();
  const [records, setRecords] = useState<ScanRecord[]>(loadHistory);
  const [tab, setTab] = useState<Tab>('scan');
  const [openId, setOpenId] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    checkHealth().then(setHealth);
  }, []);

  useEffect(() => {
    saveHistory(records);
  }, [records]);

  const openRecord = records.find((r) => r.id === openId) ?? null;

  function onScanned(item: ScanItem, thumbnail: string | null) {
    const record: ScanRecord = { id: newRecordId(), createdAt: Date.now(), thumbnail, item, followUps: [] };
    setRecords((prev) => [record, ...prev].slice(0, MAX_RECORDS));
    setOpenId(record.id);
  }

  function onTurns(id: string, followUps: AskTurn[]) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, followUps } : r)));
  }

  function onDelete(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setOpenId(null);
  }

  const setupMessage = health?.reachable && !health.ready ? health.message : null;

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">Doohav</h1>
        <button
          className="btn btn--ghost btn--compact"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? 'Light' : 'Dark'} mode
        </button>
      </header>

      <main className="main">
        {openRecord ? (
          <>
            <button className="btn btn--ghost back" onClick={() => setOpenId(null)}>
              ← Back
            </button>
            <InfoCard record={openRecord} onTurns={onTurns} onDelete={onDelete} />
          </>
        ) : tab === 'scan' ? (
          <Scanner onScanned={onScanned} setupMessage={setupMessage} />
        ) : (
          <HistoryList records={records} onOpen={setOpenId} onClearAll={() => setRecords([])} />
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        <div className="tabbar__inner">
          <button
            className="tab"
            aria-current={tab === 'scan' && !openRecord ? 'page' : undefined}
            onClick={() => {
              setTab('scan');
              setOpenId(null);
            }}
          >
            Scan
          </button>
          <button
            className="tab"
            aria-current={tab === 'history' && !openRecord ? 'page' : undefined}
            onClick={() => {
              setTab('history');
              setOpenId(null);
            }}
          >
            History{records.length > 0 ? ` (${records.length})` : ''}
          </button>
        </div>
      </nav>
    </div>
  );
}

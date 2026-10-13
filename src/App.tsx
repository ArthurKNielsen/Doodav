import { useEffect, useState } from 'react';
import { checkHealth, type Health } from './lib/api';
import { loadHistory, MAX_RECORDS, newRecordId, saveHistory, type ScanRecord } from './lib/history';
import { useTheme } from './lib/theme';
import type { AskTurn, ScanItem } from '../shared/types';
import { HistoryList } from './components/HistoryList';
import { HomeView } from './components/HomeView';
import { Icon, Mark } from './components/Icon';
import { InfoCard } from './components/InfoCard';
import { ProfileView } from './components/ProfileView';
import { Scanner } from './components/Scanner';

type Tab = 'home' | 'scan' | 'history' | 'profile';

export default function App() {
  const { theme, toggle } = useTheme();
  const [records, setRecords] = useState<ScanRecord[]>(loadHistory);
  const [tab, setTab] = useState<Tab>('scan');
  const [openId, setOpenId] = useState<string | null>(null);
  const [openAsk, setOpenAsk] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [scanTick, setScanTick] = useState(0);

  useEffect(() => {
    checkHealth().then(setHealth);
  }, []);

  useEffect(() => {
    saveHistory(records);
  }, [records]);

  const openRecord = records.find((r) => r.id === openId) ?? null;
  const aiReady = health?.reachable === true && health.ready;
  const serverMessage = health?.message ?? '';

  function goTab(next: Tab) {
    setTab(next);
    setOpenId(null);
    setOpenAsk(false);
  }

  function openScan(id: string, ask = false) {
    setOpenId(id);
    setOpenAsk(ask);
  }

  function onScanned(item: ScanItem, thumbnail: string | null) {
    const record: ScanRecord = { id: newRecordId(), createdAt: Date.now(), thumbnail, item, followUps: [] };
    setRecords((prev) => [record, ...prev].slice(0, MAX_RECORDS));
    openScan(record.id);
  }

  function onTurns(id: string, followUps: AskTurn[]) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, followUps } : r)));
  }

  function onDelete(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setOpenId(null);
  }

  const askLatest = () => {
    if (records[0]) openScan(records[0].id, true);
    else goTab('scan');
  };

  const inDetail = openRecord !== null;
  const onScanScreen = tab === 'scan' && !inDetail;

  return (
    <div className={`app ${onScanScreen ? 'app--scan' : ''}`}>
      {!onScanScreen && (
      <header className="topbar">
        <div className="brand">
          <Mark size={32} />
          <span>Doodav</span>
        </div>
        <button
          className="round-btn"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
        </button>
      </header>
      )}

      <main className="main">
        {inDetail ? (
          <>
            <div className="detail-bar">
              <button className="round-btn" onClick={() => setOpenId(null)} aria-label="Back">
                <Icon name="back" size={20} />
              </button>
              <span className="detail-bar__title">{openAsk ? 'Ask Doodav' : 'Product'}</span>
              <span className="round-btn round-btn--ghost" aria-hidden="true" />
            </div>
            <InfoCard
              key={`${openRecord.id}-${openAsk}`}
              record={openRecord}
              onTurns={onTurns}
              onDelete={onDelete}
              startAsking={openAsk}
              askAvailable={aiReady}
            />
          </>
        ) : (
          <>
            {tab === 'scan' && (
              <Scanner onScanned={onScanned} aiReady={aiReady} scanTick={scanTick} />
            )}
            {tab === 'history' && (
              <HistoryList records={records} onOpen={(id) => openScan(id)} onClearAll={() => setRecords([])} />
            )}
            {tab === 'home' && (
              <HomeView
                records={records}
                aiReady={aiReady}
                serverMessage={serverMessage}
                onScan={() => goTab('scan')}
                onOpen={(id) => openScan(id)}
              />
            )}
            {tab === 'profile' && (
              <ProfileView
                theme={theme}
                onToggleTheme={toggle}
                aiReady={aiReady}
                serverMessage={serverMessage}
                savedCount={records.length}
                onClearAll={() => setRecords([])}
              />
            )}
          </>
        )}
      </main>

      <nav className="tabbar" aria-label="Main">
        <div className="tabbar__inner">
          <NavButton label="Home" icon="home" active={!inDetail && tab === 'home'} onClick={() => goTab('home')} />
          <NavButton label="History" icon="clock" active={!inDetail && tab === 'history'} onClick={() => goTab('history')} />
          <button
            className="tabbar__scan"
            aria-label="Scan"
            aria-current={!inDetail && tab === 'scan' ? 'page' : undefined}
            onClick={() => (onScanScreen ? setScanTick((t) => t + 1) : goTab('scan'))}
          >
            <Icon name="scan" size={26} />
          </button>
          <NavButton label="Ask" icon="chat" active={inDetail && openAsk} onClick={askLatest} />
          <NavButton label="Profile" icon="user" active={!inDetail && tab === 'profile'} onClick={() => goTab('profile')} />
        </div>
      </nav>

    </div>
  );
}

function NavButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: 'home' | 'clock' | 'chat' | 'user';
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`tabbar__item ${active ? 'is-active' : ''}`} aria-label={label} aria-current={active ? 'page' : undefined} onClick={onClick}>
      <Icon name={icon} size={22} />
    </button>
  );
}

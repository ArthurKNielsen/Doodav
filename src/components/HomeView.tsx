import type { ScanRecord } from '../lib/history';
import { AiStatus } from './AiStatus';
import { Icon } from './Icon';

interface Props {
  records: ScanRecord[];
  aiReady: boolean;
  serverMessage: string;
  onScan: () => void;
  onOpen: (id: string) => void;
}

export function HomeView({ records, aiReady, serverMessage, onScan, onOpen }: Props) {
  const recent = records.slice(0, 3);
  return (
    <section className="home">
      <div className="card card--accent">
        <p className="eyebrow eyebrow--on-accent">Ready when you are</p>
        <h2 className="screen-title screen-title--on-accent">Point. Scan. Know.</h2>
        <button className="btn btn--light btn--xl" onClick={onScan}>
          <Icon name="scan" size={22} />
          Scan something
        </button>
      </div>

      <div className="card card--compact">
        <AiStatus aiReady={aiReady} serverMessage={serverMessage} />
      </div>

      <div className="home__recent">
        <div className="history__day">
          <span className="eyebrow">Recent</span>
          <span className="eyebrow">{records.length} saved</span>
        </div>
        {recent.length === 0 ? (
          <p className="muted">Nothing yet. Your scans will appear here.</p>
        ) : (
          <ul className="history__list">
            {recent.map((r) => (
              <li key={r.id}>
                <button className="row" onClick={() => onOpen(r.id)}>
                  <span className="row__icon" aria-hidden="true">
                    {r.item.source === 'barcode' ? <span className="ean">EAN</span> : <Icon name="scan" size={20} />}
                  </span>
                  <span className="row__text">
                    <span className="row__name">{r.item.name}</span>
                    <span className="muted small">{r.item.category ?? 'Scan'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

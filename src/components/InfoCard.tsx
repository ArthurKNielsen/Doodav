// The info card. Only sections with real data are rendered, so a plant doesn't
// get an "Allergens" box and a sparse result doesn't look broken.
import { useState, type ReactNode } from 'react';
import type { PriceInfo, ScanItem } from '../../shared/types';
import type { ScanRecord } from '../lib/history';
import { AskPanel } from './AskPanel';

interface Props {
  record: ScanRecord;
  onTurns: (id: string, turns: ScanRecord['followUps']) => void;
  onDelete: (id: string) => void;
}

/** "$20 – $45" for ranges, "$20" for a single number, or null if there's no price. */
export function formatPrice(price: PriceInfo): string | null {
  const { low, high, currency } = price;
  if (low === null && high === null) return null;
  const fmt = (n: number) => {
    if (currency && /^[A-Z]{3}$/.test(currency)) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
      } catch {
        // Unknown currency code: fall through to the plain format.
      }
    }
    return `${n}${currency ? ` ${currency}` : ''}`;
  };
  if (low !== null && high !== null && low !== high) return `${fmt(low)} – ${fmt(high)}`;
  return fmt((low ?? high) as number);
}

function confidenceLabel(item: ScanItem): string {
  if (item.source === 'barcode') return 'Exact match';
  if (item.confidence === 'high') return 'High confidence';
  if (item.confidence === 'medium') return 'Medium confidence';
  return 'Low confidence';
}

export function InfoCard({ record, onTurns, onDelete }: Props) {
  const { item } = record;
  const [askOpen, setAskOpen] = useState(false);
  const price = item.price ? formatPrice(item.price) : null;

  return (
    <article className="card" aria-labelledby={`card-${record.id}`}>
      <header className="card__header">
        {record.thumbnail ? (
          <img className="card__thumb" src={record.thumbnail} alt="" />
        ) : (
          <div className="card__thumb card__thumb--empty" aria-hidden="true">?</div>
        )}
        <div className="card__title">
          <h2 id={`card-${record.id}`}>{item.name}</h2>
          <div className="chips">
            {item.category && <span className="chip">{item.category}</span>}
            <span className={`chip chip--${item.source === 'barcode' ? 'ok' : item.confidence ?? 'low'}`}>
              {confidenceLabel(item)}
            </span>
          </div>
        </div>
      </header>

      {!item.identified && (
        <div className="notice notice--warn" role="note">
          <strong>Best guess</strong>
          <div>{item.confidenceNote ?? "I'm not sure what this is."}</div>
        </div>
      )}

      {item.description && <p className="card__lede">{item.description}</p>}

      {item.keyFacts.length > 0 && (
        <Section title="Key facts">
          <dl className="facts">
            {item.keyFacts.map((f) => (
              <div key={f.label} className="facts__row">
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {(price || item.whereToBuy.length > 0) && (
        <Section title="Price & where to buy">
          {price && (
            <p>
              <span className="price">{price}</span>{' '}
              <span className="muted">{item.price?.note || 'Estimated'}</span>
            </p>
          )}
          {item.whereToBuy.length > 0 && <p>{item.whereToBuy.join(' · ')}</p>}
        </Section>
      )}

      {item.careTips.length > 0 && (
        <Section title="Care, usage & safety">
          <ul className="list">
            {item.careTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </Section>
      )}

      {item.allergens && (
        <Section title="Ingredients & allergens">
          {item.allergens.contains.length > 0 && (
            <p>
              <strong>Contains:</strong> {item.allergens.contains.join(', ')}
            </p>
          )}
          {item.allergens.mayContain.length > 0 && (
            <p>
              <strong>May contain:</strong> {item.allergens.mayContain.join(', ')}
            </p>
          )}
          {item.allergens.ingredients && <p className="muted">{item.allergens.ingredients}</p>}
        </Section>
      )}

      {item.disposal && (
        <Section title="Recycling & disposal">
          <p>{item.disposal}</p>
        </Section>
      )}

      {item.funFact && (
        <Section title="Fun fact">
          <p>{item.funFact}</p>
        </Section>
      )}

      <p className="card__meta">
        {item.source === 'barcode' ? 'Product database lookup' : 'Identified by AI'} · Scanned{' '}
        {new Date(record.createdAt).toLocaleString()}
      </p>

      {!askOpen ? (
        <button className="btn btn--primary btn--xl" onClick={() => setAskOpen(true)}>
          Ask about this
        </button>
      ) : (
        <AskPanel item={item} turns={record.followUps} onTurns={(turns) => onTurns(record.id, turns)} />
      )}

      <button className="btn btn--danger-ghost" onClick={() => onDelete(record.id)}>
        Delete from history
      </button>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

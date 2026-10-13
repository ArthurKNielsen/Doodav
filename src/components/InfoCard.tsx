// The Result screen: product hero, key facts, care and safety, and the Ask entry point.
// Only sections with real data are shown, so nothing is filled in with guesses.
import { useState, type ReactNode } from 'react';
import type { PriceInfo, ScanItem } from '../../shared/types';
import type { ScanRecord } from '../lib/history';
import { AskPanel } from './AskPanel';
import { Icon } from './Icon';
import { Notice } from './Notice';

interface Props {
  record: ScanRecord;
  onTurns: (id: string, turns: ScanRecord['followUps']) => void;
  onDelete: (id: string) => void;
  /** Open the Ask chat straight away (used by the Ask tab). */
  startAsking?: boolean;
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card section">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
  );
}

export function InfoCard({ record, onTurns, onDelete, startAsking = false }: Props) {
  const { item } = record;
  const [askOpen, setAskOpen] = useState(startAsking);
  const price = item.price ? formatPrice(item.price) : null;
  const tone = item.source === 'barcode' || item.confidence === 'high' ? 'ok' : item.confidence === 'medium' ? 'warn' : 'low';

  return (
    <article className="result" aria-labelledby={`card-${record.id}`}>
      <section className="card hero">
        <div className="hero__image">
          {record.thumbnail ? (
            <img src={record.thumbnail} alt="" />
          ) : (
            <span className="hero__empty" aria-hidden="true">
              <Icon name="scan" size={40} />
            </span>
          )}
          <span className={`pill pill--${tone}`}>{confidenceLabel(item)}</span>
        </div>
        <h2 id={`card-${record.id}`} className="hero__title">
          {item.name}
        </h2>
        {item.description && <p className="muted">{item.description}</p>}
        <div className="chips">
          {item.category && <span className="chip">{item.category}</span>}
          {item.isFood && <span className="chip">Food</span>}
          {item.source === 'barcode' && <span className="chip">Barcode</span>}
        </div>
      </section>

      {!item.identified && (
        <Notice tone="warn" title="Best guess">{item.confidenceNote ?? "I'm not sure what this is."}</Notice>
      )}

      {item.keyFacts.length > 0 && (
        <Section title="Key facts">
          <div className="tiles">
            {item.keyFacts.map((f) => (
              <div key={f.label} className="tile">
                <span className="tile__value">{f.value}</span>
                <span className="tile__label muted">{f.label}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {(price || item.whereToBuy.length > 0) && (
        <Section title="Price & where to buy">
          {price && (
            <p>
              <span className="price">{price}</span> <span className="muted">{item.price?.note || 'Estimated'}</span>
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

      <p className="meta muted">
        {item.source === 'barcode' ? 'Product database lookup' : 'Identified on your device or by AI'} · Scanned{' '}
        {new Date(record.createdAt).toLocaleString()}
      </p>

      {!askOpen ? (
        <button className="btn btn--primary btn--xl" onClick={() => setAskOpen(true)}>
          Ask Doohav about this
          <Icon name="right" size={20} />
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

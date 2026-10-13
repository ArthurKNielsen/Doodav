import { useState } from 'react';
import { ask } from '../lib/api';
import type { AskTurn, ScanItem } from '../../shared/types';
import { Icon } from './Icon';
import { Notice } from './Notice';

interface Props {
  item: ScanItem;
  turns: AskTurn[];
  onTurns: (turns: AskTurn[]) => void;
}

const SUGGESTIONS = ['What is it made of?', 'Is it safe to use?', 'Where can I buy one?'];

export function AskPanel({ item, turns, onTurns }: Props) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;

    const withQuestion: AskTurn[] = [...turns, { role: 'user', content: question }];
    onTurns(withQuestion);
    setDraft('');
    setError(null);
    setPending(true);
    try {
      const answer = await ask(item, question, turns);
      onTurns([...withQuestion, { role: 'assistant', content: answer }]);
    } catch (err) {
      onTurns(turns);
      setDraft(question);
      setError(err instanceof Error ? err.message : 'Could not get an answer. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="card chat" aria-label="Ask about this item">
      <header className="chat__head">
        <span className="mark mark--small" aria-hidden="true">
          <Icon name="scan" size={16} />
        </span>
        <div>
          <strong>Ask Doodav</strong>
          <p className="muted small">Context from this scan: {item.name}</p>
        </div>
      </header>

      {turns.length === 0 && (
        <div className="chat__suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="suggestion" onClick={() => send(s)} disabled={pending}>
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <ul className="chat__log" aria-label="Conversation about this item">
          {turns.map((t, i) => (
            <li key={i} className={`bubble bubble--${t.role}`}>
              {t.content}
            </li>
          ))}
          {pending && (
            <li className="typing" role="status">
              <span className="dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Doodav is typing
            </li>
          )}
        </ul>
      )}

      {error && <Notice tone="error" title="Couldn't answer">{error}</Notice>}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <label className="sr-only" htmlFor="ask-input">
          Your question
        </label>
        <input
          id="ask-input"
          className="composer__input"
          type="text"
          enterKeyHint="send"
          placeholder="Ask about this item"
          maxLength={1000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
        />
        <button className="composer__send" type="submit" disabled={pending || draft.trim() === ''} aria-label="Send">
          <Icon name="up" size={20} />
        </button>
      </form>
    </section>
  );
}

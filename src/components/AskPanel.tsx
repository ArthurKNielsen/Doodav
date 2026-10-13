// Follow-up questions about one scanned item. Each question is one API call.
import { useState } from 'react';
import { ask } from '../lib/api';
import type { AskTurn, ScanItem } from '../../shared/types';
import { Notice } from './Notice';

interface Props {
  item: ScanItem;
  turns: AskTurn[];
  onTurns: (turns: AskTurn[]) => void;
}

export function AskPanel({ item, turns, onTurns }: Props) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const question = draft.trim();
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
      // Roll back so the question is not stuck in the history without an answer.
      onTurns(turns);
      setDraft(question);
      setError(err instanceof Error ? err.message : 'Could not get an answer. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ask">
      {turns.length > 0 && (
        <ul className="ask__log" aria-label="Conversation about this item">
          {turns.map((t, i) => (
            <li key={i} className={`bubble bubble--${t.role}`}>
              {t.content}
            </li>
          ))}
          {pending && <li className="bubble bubble--assistant bubble--pending">Thinking…</li>}
        </ul>
      )}

      {error && <Notice tone="error" title="Couldn't answer">{error}</Notice>}

      <form
        className="ask__form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="ask-input">
          Your question
        </label>
        <input
          id="ask-input"
          className="input"
          type="text"
          enterKeyHint="send"
          placeholder="e.g. Is this safe for a cat?"
          maxLength={1000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
        />
        <button className="btn btn--primary" type="submit" disabled={pending || draft.trim() === ''}>
          Send
        </button>
      </form>
    </div>
  );
}

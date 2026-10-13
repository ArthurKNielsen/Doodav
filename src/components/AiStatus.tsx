// Shows whether the AI is ready, and how long loading took (or how far along it is).
import { useEffect, useState } from 'react';
import { preloadOnDevice } from '../lib/onDevice';
import { useOnDeviceStatus } from '../lib/aiStatus';
import { formatDuration } from '../../shared/format';

/** Re-renders every 200 ms while `active`, so a live timer can count up. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

interface Props {
  /** True when a server AI (Ollama or Gemini) is configured. */
  aiReady: boolean;
  serverMessage: string;
  compact?: boolean;
}

/** One line of status plus, when relevant, a "load now" button. */
export function AiStatus({ aiReady, serverMessage, compact = false }: Props) {
  const status = useOnDeviceStatus();
  const loading = !aiReady && status.state === 'loading';
  const now = useNow(loading);

  if (aiReady) {
    return (
      <div className="ai-status ai-status--ok">
        <span className="dot dot--ok" aria-hidden="true" />
        <span>{compact ? 'AI ready' : serverMessage || 'AI ready on the server.'}</span>
      </div>
    );
  }

  if (status.state === 'loading') {
    const elapsed = status.startedAt ? now - status.startedAt : 0;
    return (
      <div className="ai-status ai-status--busy" role="status" aria-live="polite">
        <span className="dot dot--busy" aria-hidden="true" />
        <span>
          Loading on-device AI{status.progress !== null ? ` · ${status.progress}%` : ''} · {formatDuration(elapsed)} so far
        </span>
      </div>
    );
  }

  if (status.state === 'ready') {
    return (
      <div className="ai-status ai-status--ok">
        <span className="dot dot--ok" aria-hidden="true" />
        <span>
          On-device AI ready · loaded in {formatDuration(status.loadMs ?? 0)}
          {status.lastScanMs !== null ? ` · last scan ${formatDuration(status.lastScanMs)}` : ''}
        </span>
      </div>
    );
  }

  if (status.state === 'error') {
    return (
      <div className="ai-status ai-status--error">
        <span className="dot dot--error" aria-hidden="true" />
        <span>{status.message}</span>
        <button className="chip-button" onClick={() => preloadOnDevice()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="ai-status">
      <span className="dot" aria-hidden="true" />
      <span>On-device AI not loaded yet.</span>
      <button className="chip-button" onClick={() => preloadOnDevice()}>
        Load it now
      </button>
    </div>
  );
}

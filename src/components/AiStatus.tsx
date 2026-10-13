import { useEffect, useState } from 'react';
import { preloadOnDevice } from '../lib/onDevice';
import { useOnDeviceStatus } from '../lib/aiStatus';
import { formatDuration } from '../../shared/format';

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
  aiReady: boolean;
  serverMessage: string;
  compact?: boolean;
}

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

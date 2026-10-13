// Profile: appearance, the AI status and load time, and data controls.
import { useState } from 'react';
import { AiStatus } from './AiStatus';
import { Icon } from './Icon';
import type { Theme } from '../lib/theme';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  aiReady: boolean;
  serverMessage: string;
  savedCount: number;
  onClearAll: () => void;
}

export function ProfileView({ theme, onToggleTheme, aiReady, serverMessage, savedCount, onClearAll }: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="profile">
      <h2 className="screen-title">Profile</h2>

      <div className="card">
        <h3 className="eyebrow">AI</h3>
        <AiStatus aiReady={aiReady} serverMessage={serverMessage} />
        <p className="muted small">
          {aiReady
            ? 'Objects are named by the AI server you configured.'
            : 'Objects are named on this device with no key. The model downloads once per browser, then loads faster.'}
        </p>
      </div>

      <div className="card">
        <h3 className="eyebrow">Appearance</h3>
        <button className="row row--static" onClick={onToggleTheme}>
          <span className="row__icon" aria-hidden="true">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          </span>
          <span className="row__text">
            <span className="row__name">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </span>
          <Icon name="right" size={18} />
        </button>
      </div>

      <div className="card">
        <h3 className="eyebrow">Data</h3>
        <p className="muted small">{savedCount} scans saved on this device.</p>
        {confirming ? (
          <div className="row-actions">
            <button
              className="btn btn--danger"
              onClick={() => {
                onClearAll();
                setConfirming(false);
              }}
            >
              Yes, delete all
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn--danger-ghost" onClick={() => setConfirming(true)} disabled={savedCount === 0}>
            Clear all history
          </button>
        )}
      </div>

      <p className="muted small center">Doohav · scans stay on this device.</p>
    </section>
  );
}

// The Scan screen: live viewfinder, mode switch, zoom, and the Scan button.
// A tap captures a frame. Barcode mode only reads barcodes. Object mode names what's in view.
import { useRef, useState } from 'react';
import { ApiError, identify, lookupBarcode } from '../lib/api';
import { identifyOnDevice } from '../lib/onDevice';
import { detectBarcode } from '../lib/barcode';
import { canvasFromFile, canvasToJpegBase64, captureFrame, drawScaled, makeThumbnail } from '../lib/image';
import { useCamera } from '../lib/useCamera';
import type { ScanItem } from '../../shared/types';
import { AiStatus } from './AiStatus';
import { Icon } from './Icon';
import { Notice } from './Notice';

interface Props {
  onScanned: (item: ScanItem, thumbnail: string | null) => void;
  /** True when a server AI (Ollama or Gemini) is configured. Otherwise naming runs on the phone. */
  aiReady: boolean;
  serverMessage: string;
}

type Mode = 'barcode' | 'object';

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; label: string }
  | { kind: 'error'; message: string };

const MODES: Array<{ id: Mode | 'label'; label: string; soon?: boolean }> = [
  { id: 'barcode', label: 'Barcode' },
  { id: 'label', label: 'Label', soon: true },
  { id: 'object', label: 'Object' },
];

export function Scanner({ onScanned, aiReady, serverMessage }: Props) {
  // Mounted only on the Scan screen, so the camera stops when you leave it.
  const camera = useCamera(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [mode, setMode] = useState<Mode>('barcode');
  const [zoom, setZoom] = useState(1);
  const busy = phase.kind === 'working';

  /** Runs the pipeline on one frame. Barcode mode stops at the barcode. Object mode names the object. */
  async function scanCanvas(canvas: HTMLCanvasElement) {
    const thumbnail = makeThumbnail(canvas);
    try {
      let hint: string | undefined;
      if (mode === 'barcode') {
        setPhase({ kind: 'working', label: 'Reading barcode…' });
        const code = await detectBarcode(canvas);
        if (!code) {
          setPhase({ kind: 'error', message: 'No barcode found. Hold it steady, fill the frame, and try again.' });
          return;
        }
        setPhase({ kind: 'working', label: 'Looking up product…' });
        try {
          const item = await lookupBarcode(code);
          onScanned(item, thumbnail);
          setPhase({ kind: 'idle' });
          return;
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
          setPhase({ kind: 'error', message: `Barcode ${code} isn't in the product databases. Try Object mode to name it from the photo.` });
          return;
        }
      }

      if (aiReady) setPhase({ kind: 'working', label: 'Identifying…' });
      const item = aiReady
        ? await identify(canvasToJpegBase64(canvas), hint)
        : await identifyOnDevice(canvas, (message) => setPhase({ kind: 'working', label: message }));
      onScanned(item, thumbnail);
      setPhase({ kind: 'idle' });
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Something went wrong. Try again.',
      });
    }
  }

  function onScanTap() {
    const video = camera.videoRef.current;
    if (!video || video.videoWidth === 0) {
      setPhase({ kind: 'error', message: 'The camera is still starting. Try again in a second.' });
      return;
    }
    scanCanvas(captureFrame(video, zoom));
  }

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setPhase({ kind: 'working', label: 'Loading photo…' });
    try {
      const canvas = await canvasFromFile(file);
      await scanCanvas(canvas);
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : "Couldn't open that photo." });
    } finally {
      // Clear the input so picking the same photo again still fires onChange.
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const ready = camera.status === 'ready';

  return (
    <section className="scanner" aria-label="Camera">
      <div className="scanner__head">
        <p className="eyebrow">Point, then tap Scan</p>
        <h2 className="screen-title">Scan something</h2>
      </div>

      <div className="viewfinder">
        <div className="viewfinder__dots" aria-hidden="true" />
        <video
          ref={camera.videoRef}
          className="viewfinder__video"
          playsInline
          muted
          autoPlay
          style={{ transform: `scale(${zoom})` }}
        />
        <span className="corner corner--tl" aria-hidden="true" />
        <span className="corner corner--tr" aria-hidden="true" />
        <span className="corner corner--bl" aria-hidden="true" />
        <span className="corner corner--br" aria-hidden="true" />
        {ready && !busy && <div className="scan-line" aria-hidden="true" />}

        {!ready && (
          <div className="viewfinder__overlay">
            {camera.status === 'starting' ? (
              <p>Starting camera…</p>
            ) : (
              <Notice tone="error" title="No camera">
                {camera.error}
              </Notice>
            )}
          </div>
        )}

        {busy && (
          <div className="viewfinder__overlay viewfinder__overlay--busy" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <p>{phase.kind === 'working' ? phase.label : ''}</p>
          </div>
        )}

        <div className="viewfinder__pill">
          <span className={`dot ${ready ? 'dot--ok' : ''}`} aria-hidden="true" />
          {ready ? (busy ? 'Working' : 'Ready · Hold steady') : 'Camera off'}
        </div>
      </div>

      <div className="card zoom">
        <div className="zoom__row">
          <span>Zoom</span>
          <span className="mono accent">{zoom.toFixed(1)}×</span>
        </div>
        <input
          className="zoom__slider"
          type="range"
          min={1}
          max={5}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
        />
        <div className="zoom__scale mono muted">
          <span>1×</span>
          <span>3×</span>
          <span>5×</span>
        </div>
      </div>

      <div className="segmented" role="group" aria-label="Scan mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            className="segmented__item"
            aria-pressed={m.id === mode}
            disabled={m.soon || busy}
            title={m.soon ? 'Coming soon' : undefined}
            onClick={() => !m.soon && m.id !== 'label' && setMode(m.id)}
          >
            {m.label}
            {m.soon && <span className="soon">soon</span>}
          </button>
        ))}
      </div>

      {phase.kind === 'error' && (
        <Notice tone="error" title="Couldn't scan that">
          {phase.message}
        </Notice>
      )}

      <button className="btn btn--primary btn--xl" onClick={onScanTap} disabled={busy || !ready}>
        <Icon name="scan" size={22} />
        {busy ? 'Working…' : 'Scan'}
      </button>

      <button className="btn btn--ghost" onClick={() => fileInput.current?.click()} disabled={busy}>
        Choose a photo instead
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onFilePicked(e.target.files?.[0])}
      />

      <div className="card card--compact">
        <AiStatus aiReady={aiReady} serverMessage={serverMessage} />
        {!aiReady && <p className="muted small">Barcodes always work. Object naming runs on this device.</p>}
      </div>
    </section>
  );
}

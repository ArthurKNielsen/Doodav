// Live camera view with the Scan button. A tap captures one frame, looks for a
// barcode first, and falls back to AI vision when there isn't one.
import { useRef, useState } from 'react';
import { ApiError, identify, lookupBarcode } from '../lib/api';
import { detectBarcode } from '../lib/barcode';
import { canvasFromFile, canvasToJpegBase64, drawScaled, makeThumbnail } from '../lib/image';
import { useCamera } from '../lib/useCamera';
import type { ScanItem } from '../../shared/types';
import { Notice } from './Notice';

interface Props {
  onScanned: (item: ScanItem, thumbnail: string | null) => void;
  /** Shown as a setup banner when the AI isn't ready. Barcode scans still work. */
  setupMessage: string | null;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; label: string }
  | { kind: 'error'; message: string };

export function Scanner({ onScanned, setupMessage }: Props) {
  // Mounted only on the Scan tab, so the camera stops when you leave it.
  const camera = useCamera(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const busy = phase.kind === 'working';

  /** Runs the full pipeline on one frame: barcode, then the AI if needed. */
  async function scanCanvas(canvas: HTMLCanvasElement) {
    const thumbnail = makeThumbnail(canvas);
    try {
      setPhase({ kind: 'working', label: 'Reading barcode…' });
      const code = await detectBarcode(canvas);

      let hint: string | undefined;
      if (code) {
        setPhase({ kind: 'working', label: 'Looking up product…' });
        try {
          const item = await lookupBarcode(code);
          onScanned(item, thumbnail);
          setPhase({ kind: 'idle' });
          return;
        } catch (err) {
          // Not a food product: let the AI look at the photo, and tell it about the barcode.
          if (err instanceof ApiError && err.status === 404) {
            hint = `a barcode (${code}) was read but is not in the food database. It may be a non-food product.`;
          } else {
            throw err;
          }
        }
      }

      setPhase({ kind: 'working', label: 'Identifying…' });
      const item = await identify(canvasToJpegBase64(canvas), hint);
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
    scanCanvas(drawScaled(video, video.videoWidth, video.videoHeight));
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

  return (
    <section className="scanner" aria-label="Camera">
      {setupMessage && (
        <Notice tone="warn" title="Setup needed">
          Object scans won't work yet. Barcode scans still do. {setupMessage}
        </Notice>
      )}

      <div className="viewfinder">
        <video ref={camera.videoRef} className="viewfinder__video" playsInline muted autoPlay />
        {camera.status !== 'ready' && (
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
      </div>

      {phase.kind === 'error' && (
        <Notice tone="error" title="Couldn't scan that">
          {phase.message}
        </Notice>
      )}

      <button className="btn btn--primary btn--xl" onClick={onScanTap} disabled={busy || camera.status !== 'ready'}>
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

      <p className="hint">
        Point at any object, food, or barcode, then tap Scan. Barcodes are checked first.
      </p>
    </section>
  );
}

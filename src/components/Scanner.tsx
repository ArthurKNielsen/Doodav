import { useEffect, useRef, useState } from 'react';
import { ApiError, identify, lookupBarcode } from '../lib/api';
import { identifyOnDevice } from '../lib/onDevice';
import { detectBarcode } from '../lib/barcode';
import { canvasFromFile, canvasToJpegBase64, drawScaled, makeThumbnail, MAX_SIDE } from '../lib/image';

const BARCODE_SIDE = 1920;
import { useCamera } from '../lib/useCamera';
import type { ScanItem } from '../../shared/types';
import { Icon } from './Icon';
import { Notice } from './Notice';

interface Props {
  onScanned: (item: ScanItem, thumbnail: string | null) => void;
  aiReady: boolean;
  scanTick: number;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'working'; label: string }
  | { kind: 'error'; message: string };

export function Scanner({ onScanned, aiReady, scanTick }: Props) {
  const camera = useCamera(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const busy = phase.kind === 'working';
  const ready = camera.status === 'ready';

  async function scanCanvas(frame: HTMLCanvasElement) {
    const small = drawScaled(frame, frame.width, frame.height, MAX_SIDE);
    const thumbnail = makeThumbnail(small);
    try {
      let hint: string | undefined;
      setPhase({ kind: 'working', label: 'Reading barcode…' });
      const code = await detectBarcode(frame);
      if (code) {
        setPhase({ kind: 'working', label: 'Looking up product…' });
        try {
          const item = await lookupBarcode(code);
          onScanned(item, thumbnail);
          setPhase({ kind: 'idle' });
          return;
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
          hint = `a barcode (${code}) was read but is not in the product databases. It may be a non-food product.`;
        }
      }

      if (aiReady) setPhase({ kind: 'working', label: 'Identifying…' });
      const item = aiReady
        ? await identify(canvasToJpegBase64(small), hint)
        : await identifyOnDevice(small, (message) => setPhase({ kind: 'working', label: message }));
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
    if (busy) return;
    const video = camera.videoRef.current;
    if (!video || video.videoWidth === 0) {
      setPhase({ kind: 'error', message: 'The camera is still starting. Try again in a second.' });
      return;
    }
    scanCanvas(drawScaled(video, video.videoWidth, video.videoHeight, BARCODE_SIDE));
  }

  useEffect(() => {
    if (scanTick > 0) onScanTap();
  }, [scanTick]);

  async function onFilePicked(file: File | undefined) {
    if (!file) return;
    setPhase({ kind: 'working', label: 'Loading photo…' });
    try {
      await scanCanvas(await canvasFromFile(file));
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : "Couldn't open that photo." });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <section className="scan-screen" aria-label="Camera">
      <div className="viewfinder">
        <video ref={camera.videoRef} className="viewfinder__video" playsInline muted autoPlay />
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

        {phase.kind === 'error' && (
          <div className="toast" role="alert">
            <span>{phase.message}</span>
            <button className="toast__close" onClick={() => setPhase({ kind: 'idle' })} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <button
          className="photo-btn"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          aria-label="Choose a photo instead"
        >
          <Icon name="image" size={20} />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFilePicked(e.target.files?.[0])}
        />

        <div className="viewfinder__pill">
          <span className={`dot ${ready ? 'dot--ok' : ''}`} aria-hidden="true" />
          {busy ? 'Working' : ready ? 'Point at it, then tap Scan' : 'Camera off'}
        </div>
      </div>
    </section>
  );
}

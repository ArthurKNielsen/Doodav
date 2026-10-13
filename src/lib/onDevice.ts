import { buildOnDeviceItem, type Prediction } from '../../shared/onDevice';
import type { ScanItem } from '../../shared/types';
import { getOnDeviceStatus, patchOnDeviceStatus } from './aiStatus';

const MODEL_ID = 'Xenova/vit-base-patch16-224';

interface ClassifierLibrary {
  env: { allowLocalModels: boolean };
  pipeline(task: 'image-classification', model: string, options: Record<string, unknown>): Promise<Classifier>;
}
type Classifier = (input: string, options?: { top_k?: number }) => Promise<unknown>;

interface ProgressEvent {
  status: string;
  progress?: number;
}

let classifierPromise: Promise<Classifier> | null = null;

function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 200);
  return String(err).slice(0, 200);
}

async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

function loadClassifier(): Promise<Classifier> {
  if (!classifierPromise) {
    void requestPersistentStorage();
    const startedAt = Date.now();
    patchOnDeviceStatus({ state: 'loading', progress: 0, startedAt, loadMs: null, message: null });
    classifierPromise = (async () => {
      const lib = (await import('@huggingface/transformers')) as unknown as ClassifierLibrary;
      lib.env.allowLocalModels = false;
      return lib.pipeline('image-classification', MODEL_ID, {
        dtype: 'q8',
        progress_callback: (event: ProgressEvent) => {
          if (event.status === 'progress' && typeof event.progress === 'number') {
            patchOnDeviceStatus({ progress: Math.round(event.progress) });
          }
        },
      });
    })()
      .then((classify) => {
        patchOnDeviceStatus({ state: 'ready', progress: 100, startedAt: null, loadMs: Date.now() - startedAt });
        return classify;
      })
      .catch((err: unknown) => {
        classifierPromise = null;
        const detail = describeError(err);
        console.error('[on-device] model failed to load:', err);
        patchOnDeviceStatus({
          state: 'error',
          startedAt: null,
          message: `The on-device model couldn't load (${detail}). Check your internet connection, then tap Try again.`,
        });
        throw err;
      });
  }
  return classifierPromise;
}

export function preloadOnDevice(): Promise<void> {
  return loadClassifier().then(
    () => undefined,
    () => undefined,
  );
}

export async function identifyOnDevice(
  canvas: HTMLCanvasElement,
  onStatus: (message: string) => void,
): Promise<ScanItem> {
  onStatus(getOnDeviceStatus().state === 'ready' ? 'Naming it on your device…' : 'Loading the on-device model…');

  let predictions: Prediction[];
  try {
    const classify = await loadClassifier();
    onStatus('Naming it on your device…');
    const scanStarted = Date.now();
    const raw = (await classify(canvas.toDataURL('image/jpeg', 0.9), { top_k: 3 })) as Array<{
      label: string;
      score: number;
    }>;
    patchOnDeviceStatus({ lastScanMs: Date.now() - scanStarted });
    predictions = raw.map((p) => ({ label: p.label, score: p.score }));
  } catch (err) {
    throw new Error(`The on-device model couldn't load (${describeError(err)}). Tap Try again on Profile.`);
  }

  const item = buildOnDeviceItem(predictions);
  if (!item) throw new Error("Couldn't name this object. Try a clearer photo.");
  return item;
}

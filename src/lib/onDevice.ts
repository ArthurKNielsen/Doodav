// On-device naming. Runs a small image classifier in the phone's browser, so it
// needs no API key and no server. The first use downloads the model, then the browser caches it.
import { buildOnDeviceItem, prettyLabel, type Prediction, type WikiSummary } from '../../shared/onDevice';
import type { ScanItem } from '../../shared/types';
import { getOnDeviceStatus, patchOnDeviceStatus } from './aiStatus';

// ImageNet classifier (1000 everyday object classes) with 8-bit weights to keep the download small.
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

/** A short, readable description of an error for the status line. */
function describeError(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`.slice(0, 200);
  return String(err).slice(0, 200);
}

/** Loads the library and model once, timing the load. Retries on the next scan if it fails. */
function loadClassifier(): Promise<Classifier> {
  if (!classifierPromise) {
    const startedAt = Date.now();
    patchOnDeviceStatus({ state: 'loading', progress: 0, startedAt, loadMs: null, message: null });
    classifierPromise = (async () => {
      // Bundled by Vite and split into its own file, so it downloads only when a scan first needs it.
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
        // Keep the real cause, so the screen can say what actually failed.
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

/** Starts loading the model in the background, so the first scan is quick. Safe to call repeatedly. */
export function preloadOnDevice(): Promise<void> {
  return loadClassifier().then(
    () => undefined,
    () => undefined,
  );
}

/** Wikipedia's free summary API (no key). Returns null for unknown or ambiguous titles. */
export async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const slug = encodeURIComponent(title.replace(/ /g, '_'));
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      type?: string;
      title?: string;
      extract?: string;
      content_urls?: { desktop?: { page?: string } };
    };
    // "disambiguation" pages would describe the wrong thing, so skip them.
    if (data.type !== 'standard' || !data.extract) return null;
    return {
      title: data.title ?? title,
      extract: data.extract,
      url: data.content_urls?.desktop?.page ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Names the object in a canvas on the device. `onStatus` gets short messages for the
 * scan screen. Load and scan timings go to the shared status store.
 */
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

  const top = predictions[0];
  const wiki = top ? await fetchWikiSummary(prettyLabel(top.label)) : null;
  const item = buildOnDeviceItem(predictions, wiki);
  if (!item) throw new Error("Couldn't name this object. Try a clearer photo.");
  return item;
}

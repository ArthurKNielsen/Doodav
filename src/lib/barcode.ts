const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export function pickProductCode(raw: string | null | undefined): string | null {
  const code = raw?.trim() ?? '';
  return /^\d{8,14}$/.test(code) ? code : null;
}

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

function copyCanvas(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(source, 0, 0, width, height);
  return canvas;
}

function highContrastGray(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = copyCanvas(source, source.width, source.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = lum;
    min = Math.min(min, lum);
    max = Math.max(max, lum);
  }
  const span = Math.max(1, max - min);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.round(((d[i] - min) / span) * 255);
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function variantsOf(canvas: HTMLCanvasElement): HTMLCanvasElement[] {
  return [
    canvas,
    highContrastGray(canvas),
    copyCanvas(canvas, Math.round(canvas.width / 2), Math.round(canvas.height / 2)),
  ];
}

async function readWithDetector(Detector: DetectorCtor, canvas: HTMLCanvasElement): Promise<string | null> {
  const detector = new Detector({ formats: PRODUCT_FORMATS });
  for (const hit of await detector.detect(canvas)) {
    const code = pickProductCode(hit.rawValue);
    if (code) return code;
  }
  return null;
}

async function readWithZxing(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    return pickProductCode(reader.decodeFromCanvas(canvas).getText());
  } catch {
    return null;
  }
}

/**
 * Finds a product barcode in a frame. Tries the frame as it is, then a high-contrast
 * copy (for glare and dim light), then a smaller copy (sometimes easier to read).
 * Returns the digits, or null if no variant reads a barcode.
 */
export async function detectBarcode(canvas: HTMLCanvasElement): Promise<string | null> {
  const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  for (const variant of variantsOf(canvas)) {
    if (Detector) {
      try {
        const code = await readWithDetector(Detector, variant);
        if (code) return code;
      } catch {
        // Fall through to ZXing for this variant.
      }
    }
    const code = await readWithZxing(variant);
    if (code) return code;
  }
  return null;
}

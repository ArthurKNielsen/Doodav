// Barcode reading. Uses the native BarcodeDetector when the browser has it
// (Chrome/Android). iPhone Safari does not, so it falls back to ZXing.
/** Product barcode formats. QR codes are ignored because they are rarely products. */
const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/** Keeps only results that look like a product barcode (digits, 8 to 14 long). */
export function pickProductCode(raw: string | null | undefined): string | null {
  const code = raw?.trim() ?? '';
  return /^\d{8,14}$/.test(code) ? code : null;
}

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

/**
 * Finds a product barcode in a canvas. Returns the digits, or null if none is found.
 * Never throws: a failed read just means "no barcode in this photo".
 */
export async function detectBarcode(canvas: HTMLCanvasElement): Promise<string | null> {
  const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (Detector) {
    try {
      const detector = new Detector({ formats: PRODUCT_FORMATS });
      const hits = await detector.detect(canvas);
      for (const hit of hits) {
        const code = pickProductCode(hit.rawValue);
        if (code) return code;
      }
      return null;
    } catch {
      // Fall through to ZXing.
    }
  }

  try {
    // Loaded on demand: most of ZXing's weight is skipped on browsers with BarcodeDetector.
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    return pickProductCode(reader.decodeFromCanvas(canvas).getText());
  } catch {
    // ZXing throws NotFoundException when the photo has no barcode. Either way, keep going with the photo.
    return null;
  }
}

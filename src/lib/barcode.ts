const PRODUCT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export function pickProductCode(raw: string | null | undefined): string | null {
  const code = raw?.trim() ?? '';
  return /^\d{8,14}$/.test(code) ? code : null;
}

interface DetectorLike {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

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
    }
  }

  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    return pickProductCode(reader.decodeFromCanvas(canvas).getText());
  } catch {
    return null;
  }
}

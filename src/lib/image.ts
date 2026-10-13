// Image helpers: resize camera frames before upload and make small thumbnails.

/** Longest side sent to Claude. 1024 px is plenty for recognition and keeps uploads small. */
export const MAX_SIDE = 1024;

/**
 * Draws any image source onto a canvas, scaled so its longest side is at most `maxSide`.
 * Works for video frames, <img>, and ImageBitmap.
 */
export function drawScaled(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxSide = MAX_SIDE,
): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Canvas -> base64 JPEG string without the "data:" prefix. */
export function canvasToJpegBase64(canvas: HTMLCanvasElement, quality = 0.85): string {
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/** Small JPEG data URL for the history list. Tiny, so localStorage stays small. */
export function makeThumbnail(canvas: HTMLCanvasElement): string {
  const thumb = drawScaled(canvas, canvas.width, canvas.height, 160);
  return thumb.toDataURL('image/jpeg', 0.7);
}

/** Loads a user-picked file (e.g. from the photo library) as a canvas. */
export async function canvasFromFile(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (bitmap) {
    const canvas = drawScaled(bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    return canvas;
  }
  // Fallback for browsers without createImageBitmap support for this format.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file isn't a photo I can read."));
      el.src = url;
    });
    return drawScaled(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

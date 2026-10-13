// Image helpers: resize camera frames before upload and make small thumbnails.

/** Longest side sent to the AI model. 1024 px is plenty for recognition and keeps uploads small. */
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

/**
 * Captures the centre of a video frame at a digital zoom level (1 = full frame).
 * Used by the zoom slider, since phone browsers don't reliably support optical zoom.
 */
export function captureFrame(video: HTMLVideoElement, zoom: number): HTMLCanvasElement {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const sw = vw / zoom;
  const sh = vh / zoom;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

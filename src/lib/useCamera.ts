import { useEffect, useRef, useState } from 'react';

export type CameraStatus = 'starting' | 'ready' | 'error';

export interface CameraState {
  status: CameraStatus;
  error: string | null;
  errorCode: 'insecure' | 'denied' | 'no-camera' | 'busy' | 'unknown' | null;
}

export function describeCameraError(err: unknown): Omit<CameraState, 'status'> {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return {
      errorCode: 'denied',
      error:
        'Camera access is turned off. On iPhone, go to Settings > Safari > Camera and set it to Allow (or Ask). Then fully close and reopen Doodav.',
    };
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return { errorCode: 'no-camera', error: 'No camera was found on this device. You can still pick a photo.' };
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return { errorCode: 'busy', error: 'The camera is busy in another app. Close that app and try again.' };
  }
  return { errorCode: 'unknown', error: "The camera couldn't start. You can still pick a photo instead." };
}

export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>({ status: 'starting', error: null, errorCode: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({
          status: 'error',
          errorCode: 'insecure',
          error: 'The camera needs a secure (https://) address. Open the https link from your tunnel.',
        });
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setState({ status: 'ready', error: null, errorCode: null });
      } catch (err) {
        if (!cancelled) setState({ status: 'error', ...describeCameraError(err) });
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  return { videoRef, ...state };
}

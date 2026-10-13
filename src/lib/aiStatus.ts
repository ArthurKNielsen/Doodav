// Shared status of the on-device AI: loading progress, how long loading took,
// and how long the last scan took. Components subscribe with useOnDeviceStatus.
import { useSyncExternalStore } from 'react';

export type OnDeviceState = 'idle' | 'loading' | 'ready' | 'error';

export interface OnDeviceStatus {
  state: OnDeviceState;
  /** 0-100 while downloading, null when not known. */
  progress: number | null;
  /** When loading started (ms since epoch), for the live timer. */
  startedAt: number | null;
  /** Total time the model took to load, once ready. */
  loadMs: number | null;
  /** How long the most recent on-device scan took. */
  lastScanMs: number | null;
  message: string | null;
}

let status: OnDeviceStatus = {
  state: 'idle',
  progress: null,
  startedAt: null,
  loadMs: null,
  lastScanMs: null,
  message: null,
};
const listeners = new Set<() => void>();

export function getOnDeviceStatus(): OnDeviceStatus {
  return status;
}

export function patchOnDeviceStatus(patch: Partial<OnDeviceStatus>): void {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOnDeviceStatus(): OnDeviceStatus {
  return useSyncExternalStore(subscribe, getOnDeviceStatus, getOnDeviceStatus);
}

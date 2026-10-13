import { useSyncExternalStore } from 'react';

export type OnDeviceState = 'idle' | 'loading' | 'ready' | 'error';

export interface OnDeviceStatus {
  state: OnDeviceState;
  progress: number | null;
  startedAt: number | null;
  loadMs: number | null;
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

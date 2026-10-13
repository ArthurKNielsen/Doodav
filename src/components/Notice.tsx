// A rounded message box for errors, warnings, and info.
import type { ReactNode } from 'react';

interface Props {
  tone: 'error' | 'warn' | 'info';
  title: string;
  children: ReactNode;
}

export function Notice({ tone, title, children }: Props) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}

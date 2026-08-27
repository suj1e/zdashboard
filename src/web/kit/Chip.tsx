import type { ReactNode } from 'react';

export type ChipTone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const TONE_CLASS: Record<ChipTone, string> = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-info/30 bg-info/10 text-info',
};

/** 状态小徽标 */
export function Chip({ tone = 'default', children }: { tone?: ChipTone; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2 h-[var(--chip-h)] text-xs font-medium ${TONE_CLASS[tone]}`}
      data-slot="chip"
    >
      {children}
    </span>
  );
}

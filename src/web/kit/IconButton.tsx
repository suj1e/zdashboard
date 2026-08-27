import type { ReactNode } from 'react';

/** 图标按钮:label 即 aria-label,无文字面容错 */
export function IconButton({ label, onClick, disabled, className, children }: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-[var(--chip-h)] min-w-[var(--chip-h)] items-center justify-center gap-1 rounded-[var(--radius-sm)] border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

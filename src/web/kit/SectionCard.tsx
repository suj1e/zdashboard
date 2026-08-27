import type { ReactNode } from 'react';

/** 内容分组卡片 */
export function SectionCard({ title, extra, children, className }: {
  title?: ReactNode;
  extra?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[var(--radius-lg)] border border-border bg-card text-card-foreground shadow-sm ${className ?? ''}`}>
      {(title !== undefined || extra !== undefined) && (
        <header className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
          {extra && <div className="flex items-center gap-1.5 flex-none text-xs text-muted-foreground">{extra}</div>}
        </header>
      )}
      <div className="px-3.5 py-3">{children}</div>
    </section>
  );
}

const SKELETON_CLASS = 'animate-pulse rounded-[var(--radius-md)] bg-muted';

/** 骨架屏;rows>1 渲染纵向多行占位 */
export function Skeleton({ rows = 1, className }: { rows?: number; className?: string }) {
  if (rows === 1) return <div data-slot="skeleton" aria-hidden className={`${SKELETON_CLASS} h-[var(--chip-h)] ${className ?? ''}`} />;
  return (
    <div className={`space-y-2.5 ${className ?? ''}`} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} data-slot="skeleton" className={i % 3 === 2 ? `${SKELETON_CLASS} h-[var(--chip-h)] w-2/3` : `${SKELETON_CLASS} h-[var(--chip-h)]`} />
      ))}
    </div>
  );
}

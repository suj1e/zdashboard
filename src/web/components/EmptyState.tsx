import type { ReactNode } from 'react';

/** 统一空状态:icon 圆底色块 + 主/副文案(替代各工作区手写的 grid place-items-center) */
export function EmptyState({ icon, title, hint, tone = 'muted' }: {
  icon: ReactNode; title: string; hint?: string; tone?: 'muted' | 'primary';
}) {
  return (
    <div className="flex-1 grid place-items-center text-muted-foreground select-none">
      <div className="text-center">
        <div className={`mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[var(--radius-lg)] ${tone === 'primary' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <p className="text-sm text-foreground/80">{title}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { useIcons } from '../lib/icons.js';

/** 统一空状态:语义图标圆底色块 + 主/副文案 + 可选动作 */
export function EmptyState({ icon, title, hint, action }: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  const { icon: themedIcon } = useIcons();
  return (
    <div className="flex-1 grid place-items-center text-muted-foreground select-none" data-slot="empty-state">
      <div className="text-center">
        <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[var(--radius-lg)] bg-muted text-muted-foreground">
          {icon ?? themedIcon('empty:muted', 'h-6 w-6')}
        </div>
        <p className="text-sm text-foreground/80">{title}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        {action && <div className="mt-3 flex justify-center">{action}</div>}
      </div>
    </div>
  );
}

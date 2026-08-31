import type { ReactNode } from 'react';
import { Chip, type ChipTone } from './Chip.js';

/**
 * 页头:图标位 + 标题/面包屑 + 状态 chip + 动作区。
 * 插件页统一顶部结构;icon 由调用方经 useIcons 的 mode→icon 映射注入(平台不写死 emoji)。
 */
export function PageHeader({ icon, title, breadcrumb, status, actions }: {
  icon?: ReactNode;
  title: ReactNode;
  breadcrumb?: readonly string[];
  status?: { label: string; tone?: ChipTone };
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 flex-wrap mb-4">
      {icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-muted text-muted-foreground">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground truncate">{title}</h2>
        {breadcrumb && breadcrumb.length > 0 && (
          // 分段面包屑:末段(flex-none font-medium)永不截断;前段 truncate 收窄,
          // title 悬浮展示全路径(深路径可读性)
          <p className="text-xs text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1">
            {breadcrumb.map((seg, i) => {
              const last = i === breadcrumb.length - 1;
              return (
                <span key={i} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <span aria-hidden className="flex-none">/</span>}
                  <span
                    title={breadcrumb.join(' / ')}
                    className={last ? 'flex-none font-medium text-foreground/80' : 'min-w-0 truncate'}
                  >
                    {seg}
                  </span>
                </span>
              );
            })}
          </p>
        )}
      </div>
      {status && <Chip tone={status.tone ?? 'default'}>{status.label}</Chip>}
      {actions && <div className="flex items-center gap-1.5 flex-none">{actions}</div>}
    </div>
  );
}

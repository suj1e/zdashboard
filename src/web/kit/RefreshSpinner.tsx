/**
 * 后台刷新轻指示(ux-low-batch T4):usePluginData refreshing 时的小 spinner。
 * 纯 CSS 圆环(animate-spin 功能性动效,不在 reduced-motion 关闭清单);
 * role=status 供读屏播报,不影响布局(inline 固定尺寸)。
 */
export function RefreshSpinner({ className = '' }: { className?: string }) {
  return (
    <span
      data-testid="refresh-spinner"
      role="status"
      aria-label="刷新中"
      className={`inline-block h-3 w-3 flex-none shrink-0 animate-spin rounded-[var(--radius-full)] border border-muted-foreground/25 border-t-muted-foreground ${className}`}
    />
  );
}

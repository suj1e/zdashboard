import type { ReactNode } from 'react';
import { ErrorState } from './ErrorState.js';
import { EmptyState } from './EmptyState.js';
import { Skeleton } from './Skeleton.js';

export interface AsyncState {
  loading?: boolean;
  /** 字符串错误消息;非空即渲染错误态 */
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
}

/**
 * 统一三态边界:错误 > 加载 > 空 > children。
 * 插件内容仅在「有数据」时挂载,三态视觉全平台一致。
 */
export function AsyncBoundary({ loading, error, empty, onRetry, loadingRows = 4, emptyTitle = '暂无数据', children }: AsyncState & {
  loadingRows?: number;
  emptyTitle?: string;
  children?: ReactNode;
}) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <Skeleton rows={loadingRows} />;
  if (empty) return <EmptyState title={emptyTitle} />;
  return <>{children}</>;
}

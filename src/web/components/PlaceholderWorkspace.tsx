import { PackageOpen } from 'lucide-react';
import { EmptyState } from './EmptyState.js';

/** 外部插件未提供 viewerUrl 时的占位工作区 */
export function PlaceholderWorkspace({ label }: { label: string }) {
  return (
    <EmptyState icon={PackageOpen} title={`${label} · 无可视化界面`} hint="该插件只提供后端能力；在插件目录添加 web/index.html 可获得 iframe 工作区" />
  );
}

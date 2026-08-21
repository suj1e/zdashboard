import { PackageOpen } from 'lucide-react';

/** 外部插件未提供 viewerUrl 时的占位工作区 */
export function PlaceholderWorkspace({ label }: { label: string }) {
  return (
    <div className="flex-1 grid place-items-center text-muted-foreground">
      <div className="text-center">
        <PackageOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>{label} · 无可视化界面</p>
        <p className="mt-1 text-xs">
          该插件只提供后端能力；在插件目录添加 <code className="font-mono">web/index.html</code> 可获得 iframe 工作区
        </p>
      </div>
    </div>
  );
}

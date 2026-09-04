/**
 * design 侧栏:prototypes/design 目录树(目录浏览器模式,树交互同 view)。
 * asset 入 URL;SSE files 事件触发重取(usePluginData subscribe)。
 */
import { useState } from 'react';
import { FileIcon } from '../../web/components/FileIcon.js';
import { useIcons } from '../../web/lib/icons.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { fetchJson } from '../../web/lib/fetchJson.js';
import { EmptyState, ErrorState, RefreshSpinner, Skeleton } from '../../web/kit/index.js';

interface TreeNode {
  name: string;
  kind: string;
  path?: string;
  children?: TreeNode[];
  defaultCollapsed?: boolean;
}

function matches(node: TreeNode, filter: string): boolean {
  if (!filter) return true;
  if (node.name.toLowerCase().includes(filter)) return true;
  return (node.children ?? []).some((c) => matches(c, filter));
}

/** 递归目录/文件节点(文件夹可折叠,文件点击入 URL) */
function TreeNodeRow({ node, depth, filter, current, onSelect }: {
  node: TreeNode; depth: number; filter: string; current: string | null; onSelect: (p: string) => void;
}) {
  const { icon } = useIcons();
  const [open, setOpen] = useState(!node.defaultCollapsed);
  const children = (node.children ?? []).filter((c) => matches(c, filter));
  const expanded = filter ? true : open;
  if (!children.length && filter) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-foreground hover:bg-muted rounded-md"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className={`h-3 w-3 shrink-0 inline-flex items-center justify-center text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}>
          {icon('chevron-right')}
        </span>
        <span className="h-3.5 w-3.5 shrink-0 inline-flex items-center justify-center text-muted-foreground transition-colors">
          {icon(expanded ? 'folder-open' : 'folder')}
        </span>
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && children.map((c) =>
        c.kind === 'dir' ? (
          <TreeNodeRow key={c.name} node={c} depth={depth + 1} filter={filter} current={current} onSelect={onSelect} />
        ) : (
          <button
            key={c.path}
            type="button"
            onClick={() => c.path && onSelect(c.path)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted rounded-md ${current === c.path ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground'}`}
            style={{ paddingLeft: 20 + depth * 14 }}
          >
            <FileIcon name={c.name} active={current === c.path} />
            <span className="truncate">{c.name}</span>
          </button>
        ),
      )}
    </div>
  );
}

/** 顶级分组(prototypes/design),折叠态单源受控 */
function TreeGroup({ node, current, onSelect }: {
  node: TreeNode; current: string | null; onSelect: (p: string) => void;
}) {
  const { icon } = useIcons();
  const [open, setOpen] = useState(true);
  const count = node.name.match(/\((\d+)\)$/)?.[1];
  return (
    <div className="mb-1.5 px-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-1.5 pt-2 pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground rounded-md"
      >
        {icon('chevron-right', `h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`)}
        <span className="truncate">{node.name.replace(/\s\(\d+\)$/, '')}</span>
        {count && <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 font-mono text-xs font-normal">{count}</span>}
      </button>
      {open && (node.children ?? []).map((c) =>
        c.kind === 'dir' ? (
          <TreeNodeRow key={c.name} node={c} depth={1} filter="" current={current} onSelect={onSelect} />
        ) : (
          <button
            key={c.path}
            type="button"
            onClick={() => c.path && onSelect(c.path)}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted rounded-md ${current === c.path ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground'}`}
          >
            <FileIcon name={c.name} active={current === c.path} />
            <span className="truncate">{c.name}</span>
          </button>
        ),
      )}
    </div>
  );
}

export default function Sidebar() {
  const route = useRoute();
  const current = route.params.get('asset');
  const [filter, setFilter] = useState('');
  const { icon } = useIcons();

  // files 频道(SSE)到达 → 失效重取,prototypes/design 资产变更即时生效;错误经 fetchJson 门卫传播
  const assets = usePluginData<{ tree?: TreeNode[] }>('design:/__design/assets', () =>
    fetchJson<{ tree?: TreeNode[] }>('/__design/assets', { cache: 'no-store' }), { subscribe: 'files' });

  const groups = (assets.data?.tree ?? []).filter((n) => n.kind === 'dir');
  const empty = !assets.error && (assets.data || !assets.loading) && groups.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 text-xs text-muted-foreground truncate flex-none flex items-center gap-2">
        设计资产
        {assets.refreshing && <RefreshSpinner />}
      </div>
      {/* 骨架仅初始加载(loading && 无数据);有数据后台刷新静默,SSE 重取不卸载旧树 */}
      {assets.loading && !assets.data && <Skeleton rows={6} className="mx-3" />}
      {assets.error && <ErrorState message={assets.error} onRetry={assets.reload} />}
      {empty && (
        <EmptyState
          title="未发现设计资产"
          hint="在项目根创建 prototypes/ 或 design/ 目录并放入产物"
        />
      )}
      <div className="px-2 pb-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value.toLowerCase())}
          placeholder="过滤…"
          aria-label="过滤设计资产"
          className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:border-primary"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {groups.map((g) => (
          <TreeGroup key={g.name} node={g} current={current} onSelect={(p) => route.navigate({ asset: p })} />
        ))}
      </div>
    </div>
  );
}

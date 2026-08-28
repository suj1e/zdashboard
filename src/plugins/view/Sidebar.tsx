/**
 * view 侧栏:worktree 分组树 + 折叠 + 过滤。
 * T2 迁移:wt/file/filter 全部入 URL(useRoute 读写),数据走 usePluginData;
 * stats 钻取 card=dirty 时高亮 dirty worktree;params 变化不重挂载,滚动位置保持。
 * 约定化扫描 change:扫描目录为约定常量(['openspec','docs']),配置 UI 与
 * draft/commitSave 配置链路整体拆除;保留过滤框 + 树分组,
 * 树数据经 usePluginData(subscribe 'files')在文件变更时自动刷新。
 */
import { useState } from 'react';
import { useIcons } from '../../web/lib/icons.js';
import { FileIcon } from '../../web/components/FileIcon.js';
import type { TreeNode } from '../../server/spec-scan.js';
import { matches } from './filter.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';

interface WorktreeInfo {
  path: string;
  name: string;
  branch: string;
  head: string;
  dirty: boolean;
}

interface TreesData {
  worktrees: WorktreeInfo[];
  wtTrees: Record<string, TreeNode[]>;
  rootTree: TreeNode[];
}

async function fetchTrees(): Promise<TreesData> {
  const worktrees = await fetch('/__worktrees', { cache: 'no-store' })
    .then(r => r.json() as Promise<WorktreeInfo[]>)
    .catch(() => [] as WorktreeInfo[]);
  const wtTrees: Record<string, TreeNode[]> = {};
  await Promise.all(worktrees.map(async (wt) => {
    try {
      const d = await fetch(`/__files?wt=${encodeURIComponent(wt.path)}`, { cache: 'no-store' }).then(r => r.json());
      wtTrees[wt.path] = d.tree ?? [];
    } catch { wtTrees[wt.path] = []; }
  }));
  const rootTree = await fetch('/__files', { cache: 'no-store' })
    .then(r => r.json())
    .then((d: { tree?: TreeNode[] }) => d.tree ?? [])
    .catch(() => [] as TreeNode[]);
  return { worktrees, wtTrees, rootTree };
}

function TreeDir({ node, depth, filter, current, onSelectFile }: {
  node: TreeNode; depth: number; filter: string; current: string | null; onSelectFile: (p: string) => void;
}) {
  const { icon } = useIcons();
  const all = node.children ?? [];
  // 目录名自身命中过滤词 → 展示整个子树;否则按子树递归匹配收窄
  const selfMatch = !!filter && node.name.toLowerCase().includes(filter);
  const children = selfMatch ? all : all.filter((c) => matches(c, filter));
  const [open, setOpen] = useState(!node.defaultCollapsed);
  const expanded = filter ? true : open;
  if (!children.length && filter) return null;
  return (
    <div>
      {(() => {
        const groupMatch = node.name.match(/^([a-z]+)(?: \((\d+)\))?$/);
        const groupIconNode = groupMatch ? icon(groupMatch[1] as never) : undefined;
        return (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-foreground hover:bg-muted rounded-md mx-1"
            style={{ paddingLeft: 8 + depth * 14, width: 'calc(100% - 8px)' }}
          >
            <span className={`h-3 w-3 shrink-0 inline-flex items-center justify-center text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}>
              {icon('chevron-right')}
            </span>
            {groupIconNode
              ? <span className="h-3.5 w-3.5 shrink-0 inline-flex items-center justify-center text-muted-foreground">{groupIconNode}</span>
              : <span className="h-3.5 w-3.5 shrink-0 inline-flex items-center justify-center text-muted-foreground transition-colors">{icon(expanded ? 'folder-open' : 'folder')}</span>}
            <span className="font-medium truncate">{groupMatch ? groupMatch[1] : node.name}</span>
            {groupMatch?.[2] && (
              <span className="ml-auto mr-1 shrink-0 rounded-full bg-muted px-1.5 text-xs font-mono text-muted-foreground">{groupMatch[2]}</span>
            )}
          </button>
        );
      })()}
      {expanded && children.map((c) =>
        c.kind === 'dir' ? (
          <TreeDir key={c.name + depth} node={c} depth={depth + 1} filter={filter} current={current} onSelectFile={onSelectFile} />
        ) : (
          <button
            key={c.path}
            onClick={() => c.path && onSelectFile(c.path)}
            className={`w-full flex items-center gap-1.5 pr-2 py-1 text-sm hover:bg-muted rounded-md mx-1 ${current === c.path ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground'}`}
            style={{ paddingLeft: 20 + depth * 14, width: 'calc(100% - 8px)' }}
          >
            <FileIcon name={c.name} active={current === c.path} />
            <span className="truncate">{c.name}</span>
          </button>
        )
      )}
    </div>
  );
}

export default function Sidebar() {
  const route = useRoute();
  const params = route.params;
  const urlFile = params.get('file');
  const urlWt = params.get('wt');
  const filter = (params.get('filter') ?? '').toLowerCase();
  const drillDirty = params.get('card') === 'dirty';

  const { icon } = useIcons();
  const [collapsedWt, setCollapsedWt] = useState<Set<string>>(new Set());
  const [collapsedRoot, setCollapsedRoot] = useState(false);
  const trees = usePluginData<TreesData>('view:sidebar-trees', fetchTrees, { subscribe: 'files' });

  const worktrees = trees.data?.worktrees ?? [];
  const wtTrees = trees.data?.wtTrees ?? {};
  const rootTree = trees.data?.rootTree ?? [];

  const toggleWt = (path: string) => {
    setCollapsedWt(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const toggleRoot = () => setCollapsedRoot(prev => !prev);

  const setFilter = (v: string) => {
    route.navigate({ filter: v.trim() ? v : null }, { replace: true });
  };

  const showWorktrees = worktrees.length > 0;

  return (
    <div className="p-2 flex flex-col h-full">
      <div className="flex-1 min-h-0 flex flex-col">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="过滤…"
          data-testid="view-filter-input"
          className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
        />
        <div className="py-1 flex-1 min-h-0 overflow-auto" data-testid="view-tree-scroller">
          {showWorktrees && worktrees.map((wt) => {
            const tree = wtTrees[wt.path] ?? [];
            const filtered = tree.filter((n) => matches(n, filter));
            if (!filtered.length && filter) return null;
            const highlightDirty = drillDirty && wt.dirty;
            return (
              <div key={wt.path} className="mb-1">
                <button
                  onClick={() => toggleWt(wt.path)}
                  data-drill-dirty={highlightDirty ? 'true' : undefined}
                  className={`w-full flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md ${highlightDirty ? 'bg-warning/10 ring-1 ring-warning' : ''}`}
                >
                  <span className="h-3 w-3 shrink-0 inline-flex items-center justify-center text-muted-foreground transition-transform">
                    {icon('chevron-right', collapsedWt.has(wt.path) ? '' : 'rotate-90')}
                  </span>
                  <span className="h-3 w-3 shrink-0 inline-flex items-center justify-center text-muted-foreground">
                    {icon('git-branch')}
                  </span>
                  <span className="truncate">{wt.branch}</span>

                  {wt.dirty && <span className="ml-auto flex-none h-2 w-2 rounded-full bg-destructive shrink-0" title="有未提交变更" />}
                </button>
                {!collapsedWt.has(wt.path) && (
                  <div className="ml-2">
                    {filtered.map((n) => (
                      <TreeDir
                        key={n.name}
                        node={n}
                        depth={1}
                        filter={filter}
                        current={urlWt === wt.path ? urlFile : null}
                        onSelectFile={(p) => route.navigate({ wt: wt.path, file: p })}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {rootTree.length > 0 && (!filter || rootTree.some((n) => matches(n, filter))) && (
            <div className="mb-1">
              <button
                onClick={toggleRoot}
                className="w-full flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md"
              >
                <span className={`h-3 w-3 shrink-0 inline-flex items-center justify-center text-muted-foreground transition-transform ${!collapsedRoot ? 'rotate-90' : ''}`}>
                  {icon('chevron-right')}
                </span>
                <span className="h-3 w-3 shrink-0 inline-flex items-center justify-center text-muted-foreground">
                  {icon('git-branch')}
                </span>
                <span>当前分支</span>
              </button>
              {!collapsedRoot && (
                <div className="ml-2">
                  {rootTree.filter((n) => matches(n, filter)).map((n) => (
                    <TreeDir
                      key={n.name}
                      node={n}
                      depth={1}
                      filter={filter}
                      current={urlWt ? null : urlFile}
                      onSelectFile={(p) => route.navigate({ wt: null, file: p })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

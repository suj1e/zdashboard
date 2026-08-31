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
import { fetchJson } from '../../web/lib/fetchJson.js';
import { safeGetItem, safeSetItem } from '../../web/lib/safeStorage.js';
import { EmptyState, ErrorState, RefreshSpinner, Skeleton } from '../../web/kit/index.js';

/** 折叠集合持久化键(JSON `{ wt: string[], root: boolean }`,zd- 前缀规范) */
const VIEW_COLLAPSE_KEY = 'zd-view-collapse';

interface CollapseState { wt: string[]; root: boolean }

/** 读折叠集合;缺省/损坏一律回落全展开(与无存储时行为一致) */
function readCollapse(): CollapseState {
  try {
    const raw = safeGetItem(VIEW_COLLAPSE_KEY);
    if (!raw) return { wt: [], root: false };
    const o = JSON.parse(raw) as Partial<CollapseState>;
    return {
      wt: Array.isArray(o.wt) ? o.wt.filter((x): x is string => typeof x === 'string') : [],
      root: o.root === true,
    };
  } catch {
    return { wt: [], root: false };
  }
}

function writeCollapse(next: CollapseState) {
  safeSetItem(VIEW_COLLAPSE_KEY, JSON.stringify(next));
}

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
  // 错误一律传播(fetchJson 门卫):任何一段失败 → usePluginData error 态 → ErrorState 可重试
  const worktrees = await fetchJson<WorktreeInfo[]>('/__worktrees', { cache: 'no-store' });
  const wtTrees: Record<string, TreeNode[]> = {};
  await Promise.all(worktrees.map(async (wt) => {
    const d = await fetchJson<{ tree?: TreeNode[] }>(`/__files?wt=${encodeURIComponent(wt.path)}`, { cache: 'no-store' });
    wtTrees[wt.path] = d.tree ?? [];
  }));
  const root = await fetchJson<{ tree?: TreeNode[] }>('/__files', { cache: 'no-store' });
  return { worktrees, wtTrees, rootTree: root.tree ?? [] };
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
            aria-expanded={expanded}
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
  const [collapse, setCollapse] = useState<CollapseState>(readCollapse);
  const collapsedWt = new Set(collapse.wt);
  const collapsedRoot = collapse.root;
  const trees = usePluginData<TreesData>('view:sidebar-trees', fetchTrees, { subscribe: 'files' });

  const worktrees = trees.data?.worktrees ?? [];
  const wtTrees = trees.data?.wtTrees ?? {};
  const rootTree = trees.data?.rootTree ?? [];

  const toggleWt = (path: string) => {
    setCollapse(prev => {
      const wt = new Set(prev.wt);
      if (wt.has(path)) wt.delete(path);
      else wt.add(path);
      const next = { ...prev, wt: [...wt] };
      writeCollapse(next);
      return next;
    });
  };

  const toggleRoot = () => setCollapse(prev => {
    const next = { ...prev, root: !prev.root };
    writeCollapse(next);
    return next;
  });

  const setFilter = (v: string) => {
    route.navigate({ filter: v.trim() ? v : null }, { replace: true });
  };

  const showWorktrees = worktrees.length > 0;
  // 空态与过滤态分离:无过滤且无数据 → 引导空态;有过滤但全树无匹配 → 「无匹配结果」
  const hasFilterMatch =
    !!filter && (worktrees.some((wt) => (wtTrees[wt.path] ?? []).some((n) => matches(n, filter)))
      || rootTree.some((n) => matches(n, filter)));
  const treeEmpty = !filter && !!trees.data && !showWorktrees && rootTree.length === 0;
  const filterEmpty = !!filter && !!trees.data && !hasFilterMatch;

  return (
    <div className="p-2 flex flex-col h-full">
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="w-full flex items-center gap-2">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="过滤…"
            data-testid="view-filter-input"
            className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:border-primary"
          />
          {trees.refreshing && <RefreshSpinner />}
        </div>
        <div className="py-1 flex-1 min-h-0 overflow-auto flex flex-col" data-testid="view-tree-scroller">
          {/* 骨架仅初始加载(loading && 无数据);有数据后台刷新静默,SSE 重取不卸载树 */}
          {trees.loading && !trees.data && <Skeleton rows={6} className="mx-1 mt-1" />}
          {trees.error && <ErrorState message={trees.error} onRetry={trees.reload} />}
          {treeEmpty && (
            <EmptyState
              title="暂无可展示的规格文件"
              hint="约定扫描目录:openspec / docs / .zdev/apply"
            />
          )}
          {filterEmpty && <EmptyState title="无匹配结果" hint="调整或清空过滤词后重试" />}
          {!!trees.data && !trees.error && !treeEmpty && !filterEmpty && (
            <>
          {showWorktrees && worktrees.map((wt) => {
            const tree = wtTrees[wt.path] ?? [];
            const filtered = tree.filter((n) => matches(n, filter));
            if (!filtered.length && filter) return null;
            const highlightDirty = drillDirty && wt.dirty;
            return (
              <div key={wt.path} className="mb-1">
                <button
                  onClick={() => toggleWt(wt.path)}
                  aria-expanded={!collapsedWt.has(wt.path)}
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
                aria-expanded={!collapsedRoot}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

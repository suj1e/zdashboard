/**
 * view 侧栏:worktree 分组树 + 折叠 + 过滤 + 配置。
 * T2 迁移:wt/file/filter 全部入 URL(useRoute 读写),数据走 usePluginData;
 * stats 钻取 card=dirty 时高亮 dirty worktree;params 变化不重挂载,滚动位置保持。
 */
import { useState } from 'react';
import { useIcons } from '../../web/lib/icons.js';
import { FileIcon } from '../../web/components/FileIcon.js';
import type { TreeNode } from '../../server/spec-scan.js';
import { matches } from './filter.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { usePluginConfig } from '../../web/hooks/usePluginConfig.js';
import { ConfigField } from '../../web/components/ConfigField.js';
import { createPortal } from 'react-dom';
import { manifest } from './manifest.js';

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
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [collapsedWt, setCollapsedWt] = useState<Set<string>>(new Set());
  const [collapsedRoot, setCollapsedRoot] = useState(false);
  const { config, save, saving } = usePluginConfig('view', manifest.config);
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

  const hasDraft = Object.keys(draft).length > 0;
  const draftSave = (key: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const commitSave = async () => {
    await save({ ...config, ...draft });
    setDraft({});
    trees.reload();
  };

  const setFilter = (v: string) => {
    route.navigate({ filter: v.trim() ? v : null }, { replace: true });
  };

  const showWorktrees = worktrees.length > 0;

  return (
    <div className="p-2 flex flex-col h-full">
      <div className="mb-2">
        <button
          onClick={() => setShowConfigModal(true)}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
        >
          {icon('settings', 'h-3.5 w-3.5')}
          <span>配置</span>
        </button>
      </div>

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

      {showConfigModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfigModal(false)}>
          <div className="bg-background border rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-base font-semibold">View 配置</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                {icon('x', 'h-4 w-4')}
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {manifest.config ? (
                <div className="grid grid-cols-2 gap-4">
                  <ConfigField key_="scanDirs" field={manifest.config.scanDirs} value={config.scanDirs} onChange={(k, v) => draftSave(k, v)} />
                  <ConfigField key_="defaultExpandDepth" field={manifest.config.defaultExpandDepth} value={config.defaultExpandDepth} onChange={(k, v) => draftSave(k, v)} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">该插件暂无配置项</p>
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs">
                  {saving ? <span className="text-muted-foreground">保存中…</span> : hasDraft && <span className="text-muted-foreground">有未保存的更改</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDraft({});
                      save(Object.fromEntries(Object.entries(manifest.config ?? {}).map(([k, f]) => [k, f.default])));
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    重置默认
                  </button>
                  <button
                    onClick={commitSave}
                    disabled={!hasDraft}
                    className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useIcons } from '../../web/lib/icons.js';
import { FileIcon } from '../../web/components/FileIcon.js';
import type { TreeNode } from '../../server/spec-scan.js';
import { viewState } from './state.js';
import { useDebounce } from 'use-debounce';
import { usePluginConfig } from '../../web/hooks/usePluginConfig.js';
import { ConfigField } from '../../web/components/ConfigField.js';
import { createPortal } from 'react-dom';

const VIEW_CONFIG_SCHEMA = {
  scanDirs: { type: 'string[]' as const, label: '扫描目录', default: ['openspec'] },
  defaultExpandDepth: { type: 'number' as const, label: '默认展开深度', default: 2 },
};

interface WorktreeInfo {
  path: string;
  name: string;
  branch: string;
  head: string;
  dirty: boolean;
}

function matches(node: TreeNode, q: string): boolean {
  if (!q) return true;
  if (node.name.toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((c) => matches(c, q));
}

function TreeDir({ node, depth, filter, current, onSelectFile }: {
  node: TreeNode; depth: number; filter: string; current: string | null; onSelectFile: (p: string) => void;
}) {
  const children = (node.children ?? []).filter((c) => matches(c, filter));
  const [open, setOpen] = useState(!node.defaultCollapsed);
  const expanded = filter ? true : open;
  if (!children.length && filter) return null;
  const { icon } = useIcons();
  return (
    <div>
      {(() => {
        const groupMatch = node.name.match(/^([a-z]+)(?: \((\d+)\))?$/);
        const groupIconNode = groupMatch ? icon(groupMatch[1] as any) : undefined;
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

interface SidebarProps {
  navTarget?: { mode?: string; filter?: string; wt?: string; navToken?: number };
}

export default function Sidebar({ navTarget }: SidebarProps) {
  const current = useSyncExternalStore(viewState.subscribe, viewState.get);
  const { icon } = useIcons();
  const [filter, setFilter] = useState('');
  const [debouncedFilter] = useDebounce(filter, 150);
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);
  const [wtTrees, setWtTrees] = useState<Record<string, TreeNode[]>>({});
  const [rootTree, setRootTree] = useState<TreeNode[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [collapsedWt, setCollapsedWt] = useState<Set<string>>(new Set());
  const [collapsedRoot, setCollapsedRoot] = useState(false);
  const { config, save, saving } = usePluginConfig('view', VIEW_CONFIG_SCHEMA);

  // pre-fill filter when navigated from stats drill-down
  useEffect(() => {
    if (navTarget?.filter) {
      setFilter(navTarget.filter);
    }
  }, [navTarget?.filter, navTarget?.navToken]);

  // fetch worktrees + each worktree's file tree + root tree (current branch)
  useEffect(() => {
    fetch('/__worktrees', { cache: 'no-store' })
      .then(r => r.json())
      .then(async (wts: WorktreeInfo[]) => {
        setWorktrees(wts);
        const trees: Record<string, TreeNode[]> = {};
        await Promise.all(wts.map(async (wt) => {
          try {
            const r = await fetch(`/__files?wt=${encodeURIComponent(wt.path)}`, { cache: 'no-store' });
            const d = await r.json();
            trees[wt.path] = d.tree ?? [];
          } catch { trees[wt.path] = []; }
        }));
        setWtTrees(trees);
      })
      .catch(() => setWorktrees([]));

    // root tree for current branch
    fetch('/__files', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setRootTree(d.tree ?? []))
      .catch(() => setRootTree([]));
  }, []);

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

  const loadTrees = async () => {
    const [wtRes, rootRes] = await Promise.all([
      fetch('/__worktrees', { cache: 'no-store' }).then(r => r.json()).catch(() => []),
      fetch('/__files', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ tree: [] })),
    ]);
    setWorktrees(wtRes);
    const trees: Record<string, TreeNode[]> = {};
    await Promise.all((wtRes ?? []).map(async (wt: WorktreeInfo) => {
      try {
        const r = await fetch(`/__files?wt=${encodeURIComponent(wt.path)}`, { cache: 'no-store' });
        const d = await r.json();
        trees[wt.path] = d.tree ?? [];
      } catch { trees[wt.path] = []; }
    }));
    setWtTrees(trees);
    setRootTree(rootRes.tree ?? []);
  };

  const commitSave = async () => {
    await save({ ...config, ...draft });
    setDraft({});
    await loadTrees();
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

      <div className="flex-1 min-h-0">
        <input
        value={filter}
        onChange={e => setFilter(e.target.value.toLowerCase())}
        placeholder="过滤…"
        className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
      />
      <div className="py-1">
        {showWorktrees && worktrees.map((wt) => {
          const tree = wtTrees[wt.path] ?? [];
          const filtered = tree.filter((n) => matches(n, debouncedFilter));
          if (!filtered.length && debouncedFilter) return null;
          return (
            <div key={wt.path} className="mb-1">
              <button
                onClick={() => toggleWt(wt.path)}
                className="w-full flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-md"
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
                    <TreeDir key={n.name} node={n} depth={1} filter={debouncedFilter} current={current} onSelectFile={(p) => viewState.set(p)} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {rootTree.length > 0 && (
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
                {rootTree.filter((n) => matches(n, debouncedFilter)).map((n) => (
                  <TreeDir key={n.name} node={n} depth={1} filter={debouncedFilter} current={current} onSelectFile={(p) => viewState.set(p)} />
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
              <div className="grid grid-cols-2 gap-4">
                <ConfigField key_="scanDirs" field={VIEW_CONFIG_SCHEMA.scanDirs} value={config.scanDirs} onChange={(k, v) => draftSave(k, v)} />
                <ConfigField key_="defaultExpandDepth" field={VIEW_CONFIG_SCHEMA.defaultExpandDepth} value={config.defaultExpandDepth} onChange={(k, v) => draftSave(k, v)} />
              </div>
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs">
                  {hasDraft && <span className="text-muted-foreground">有未保存的更改</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDraft({});
                      save({ scanDirs: ['openspec'], defaultExpandDepth: 2 });
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

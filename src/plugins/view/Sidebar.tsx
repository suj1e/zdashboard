import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useIcons } from '../../web/lib/icons.js';
import { FileIcon } from '../../web/components/FileIcon.js';
import type { TreeNode } from '../../server/spec-scan.js';
import { viewState } from './state.js';
import { useDebounce } from 'use-debounce';
import { usePluginConfig } from '../../web/hooks/usePluginConfig.js';
import { ConfigField } from '../../web/components/ConfigField.js';

const VIEW_CONFIG_SCHEMA = {
  hiddenDirs: { type: 'string[]' as const, label: '隐藏目录', default: ['.git', 'node_modules', 'dist', 'build'] },
  defaultExpandDepth: { type: 'number' as const, label: '默认展开深度', default: 2 },
  showHidden: { type: 'boolean' as const, label: '显示隐藏文件', default: false },
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
  const [showConfig, setShowConfig] = useState(false);
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

  const showWorktrees = worktrees.length > 0;

  return (
    <div className="p-2">
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
      <div className="border-t border-border mt-2">
        <button
          onClick={() => setShowConfig(o => !o)}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <span className={`h-3 w-3 shrink-0 inline-flex items-center justify-center transition-transform ${showConfig ? 'rotate-90' : ''}`}>
            {icon('chevron-right')}
          </span>
          ⚙️ 配置
        </button>
        {showConfig && (
          <div className="px-3 pb-3 space-y-3">
            <ConfigField key_="hiddenDirs" field={VIEW_CONFIG_SCHEMA.hiddenDirs} value={config.hiddenDirs} onChange={(k, v) => save({ ...config, [k]: v })} />
            <ConfigField key_="defaultExpandDepth" field={VIEW_CONFIG_SCHEMA.defaultExpandDepth} value={config.defaultExpandDepth} onChange={(k, v) => save({ ...config, [k]: v })} />
            <ConfigField key_="showHidden" field={VIEW_CONFIG_SCHEMA.showHidden} value={config.showHidden} onChange={(k, v) => save({ ...config, [k]: v })} />
            <div className="text-xs text-muted-foreground">{saving ? '保存中…' : '配置已保存'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

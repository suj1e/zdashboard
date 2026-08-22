import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ChevronRight, FileText, Image as ImageIcon, GitBranch } from 'lucide-react';
import type { TreeNode } from '../../server/spec-scan.js';
import { viewState } from './state.js';

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

function FileIcon({ name }: { name: string }) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(ext)) return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

function TreeDir({ node, depth, filter, current, onSelectFile }: {
  node: TreeNode; depth: number; filter: string; current: string | null; onSelectFile: (p: string) => void;
}) {
  const children = (node.children ?? []).filter((c) => matches(c, filter));
  const [open, setOpen] = useState(!node.defaultCollapsed);
  const expanded = filter ? true : open;
  if (!children.length && filter) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1 px-2 py-1 text-xs text-foreground hover:bg-muted"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        <span className="font-medium truncate">{node.name}</span>
      </button>
      {expanded && children.map((c) =>
        c.kind === 'dir' ? (
          <TreeDir key={c.name + depth} node={c} depth={depth + 1} filter={filter} current={current} onSelectFile={onSelectFile} />
        ) : (
          <button
            key={c.path}
            onClick={() => c.path && onSelectFile(c.path)}
            className={`w-full flex items-center gap-1.5 pr-2 py-1 text-xs border-l-2 border-transparent hover:bg-muted ${current === c.path ? 'bg-muted font-medium border-primary' : 'text-muted-foreground'}`}
            style={{ paddingLeft: 20 + depth * 14 }}
          >
            <FileIcon name={c.name} />
            <span className="truncate">{c.name}</span>
          </button>
        )
      )}
    </div>
  );
}

interface SidebarProps {
  navTarget?: { mode?: string; filter?: string; wt?: string };
}

function WorktreeGroup({ worktrees }: { worktrees: WorktreeInfo[] }) {
  const handleNav = (wt: WorktreeInfo) => {
    window.dispatchEvent(new CustomEvent('zd-dashboard-nav', { detail: { mode: 'apply', wt: wt.name } }));
  };

  return (
    <div className="mb-1">
      <div className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-muted-foreground tracking-wide">
        <GitBranch className="h-3 w-3" />
        <span>Worktrees ({worktrees.length})</span>
      </div>
      {worktrees.map((wt) => (
        <button
          key={wt.name}
          onClick={() => handleNav(wt)}
          title={`${wt.branch}${wt.dirty ? ' · 有未提交变更' : ''}`}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-foreground hover:bg-muted border-l-2 border-transparent"
          style={{ paddingLeft: 14 }}
        >
          <span className="truncate font-mono text-[11px]">{wt.branch}</span>
          <span className="text-muted-foreground truncate">/{wt.name}</span>
          {wt.dirty && <span className="ml-auto flex-none h-2 w-2 rounded-full bg-destructive shrink-0" title="有未提交变更" />}
        </button>
      ))}
    </div>
  );
}

export default function Sidebar({ navTarget }: SidebarProps) {
  const current = useSyncExternalStore(viewState.subscribe, viewState.get);
  const [data, setData] = useState<TreeNode[] | null>(null);
  const [filter, setFilter] = useState('');
  const [worktrees, setWorktrees] = useState<WorktreeInfo[]>([]);

  // B2: pre-fill filter when navigated from stats drill-down
  // 无条件覆盖(不 gate 在 !filter):同 mode 导航/重挂载时,传入的新 filter 必须生效
  useEffect(() => {
    if (navTarget?.filter) {
      setFilter(navTarget.filter);
    }
  }, [navTarget?.filter, navTarget?.navToken]);

  useEffect(() => {
    fetch('/__files', { cache: 'no-store' }).then(r => r.json()).then((d) => setData(d.tree ?? []));
  }, []);

  useEffect(() => {
    fetch('/__worktrees', { cache: 'no-store' })
      .then(r => r.json())
      .then(setWorktrees)
      .catch(() => setWorktrees([]));
  }, []);

  const tree = useMemo(() => {
    if (!data) return [];
    return data.filter((n) => matches(n, filter));
  }, [data, filter]);

  const showWorktrees = worktrees.length > 0;

  return (
    <div className="p-2">
      <input
        value={filter}
        onChange={e => setFilter(e.target.value.toLowerCase())}
        placeholder="过滤…"
        className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
      />
      {!data ? (
        <p className="p-3 text-xs text-muted-foreground">加载中…</p>
      ) : !tree.length && !showWorktrees ? (
        <p className="p-3 text-xs text-muted-foreground">无匹配</p>
      ) : (
        <div className="py-1">
          {showWorktrees && <WorktreeGroup worktrees={worktrees} />}
          {tree.map((n) => (
            <TreeDir key={n.name} node={n} depth={0} filter={filter} current={current} onSelectFile={(p) => viewState.set(p)} />
          ))}
        </div>
      )}
    </div>
  );
}

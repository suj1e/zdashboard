import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Image as ImageIcon } from 'lucide-react';
import type { TreeNode } from '../../server/spec-scan.js';

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

function TreeDir({ node, depth, filter, currentPath, onSelectFile }: {
  node: TreeNode; depth: number; filter: string; currentPath: string | null; onSelectFile: (p: string) => void;
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
          <TreeDir key={c.name + depth} node={c} depth={depth + 1} filter={filter} currentPath={currentPath} onSelectFile={onSelectFile} />
        ) : (
          <button
            key={c.path}
            onClick={() => c.path && onSelectFile(c.path)}
            className={`w-full flex items-center gap-1.5 pr-2 py-1 text-xs border-l-2 border-transparent hover:bg-muted ${currentPath === c.path ? 'bg-muted font-medium border-primary' : 'text-muted-foreground'}`}
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

export function FileTree({ open, currentPath, onSelectFile, refreshKey }: {
  open: boolean; currentPath: string | null; onSelectFile: (p: string) => void; refreshKey: number;
}) {
  const [data, setData] = useState<TreeNode[] | null>(null);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    fetch('/__files', { cache: 'no-store' }).then(r => r.json()).then((d) => setData(d.tree ?? []));
  }, [refreshKey]);

  const tree = useMemo(() => {
    if (!data) return [];
    return data.filter((n) => matches(n, filter));
  }, [data, filter]);

  return (
    <aside className={`border-r bg-background overflow-auto fixed z-20 h-full w-[78%] max-w-[280px] transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-2 sticky top-0 bg-background z-10 border-b">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value.toLowerCase())}
          placeholder="过滤…"
          className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
        />
      </div>
      {!data ? (
        <p className="p-3 text-xs text-muted-foreground">加载中…</p>
      ) : !tree.length ? (
        <p className="p-3 text-xs text-muted-foreground">无匹配</p>
      ) : (
        <div className="py-1">
          {tree.map((n) => (
            <TreeDir key={n.name} node={n} depth={0} filter={filter} currentPath={currentPath} onSelectFile={onSelectFile} />
          ))}
        </div>
      )}
    </aside>
  );
}

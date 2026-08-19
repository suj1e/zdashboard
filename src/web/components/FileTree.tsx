import { useEffect, useMemo, useState } from 'react';
import { Bug, ChevronRight, FileText, Image as ImageIcon, Terminal } from 'lucide-react';
import { Button } from './ui/button';
import type { TreeNode } from '../../server/spec-scan';
import type { DashboardPlugin } from '../../server/plugins';

interface FilesPayload { tree: TreeNode[]; hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean; }

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

export function FileTree({ open: sidebarOpen, currentPath, onSelectFile, onSelectLog, onSelectPlugin, plugins, activeMode, refreshKey }: {
  open: boolean; currentPath: string | null; onSelectFile: (p: string) => void; onSelectLog: () => void; onSelectPlugin: (mode: string, label: string, icon: string) => void; plugins: DashboardPlugin[]; activeMode: string; refreshKey: number;
}) {
  const [data, setData] = useState<FilesPayload | null>(null);
  const [filter, setFilter] = useState('');
  const [logActive, setLogActive] = useState(false);
  const [activePluginMode, setActivePluginMode] = useState<string | null>(null);
  useEffect(() => {
    fetch('/__files', { cache: 'no-store' }).then(r => r.json()).then(setData);
  }, [refreshKey]);
  useEffect(() => { setLogActive(false); setActivePluginMode(null); }, [currentPath]);

  const tree = useMemo(() => (data?.tree ?? []).filter(n => matches(n, filter)), [data, filter]);

  const handlePluginClick = (plugin: DashboardPlugin) => {
    onSelectPlugin(plugin.mode, plugin.label, plugin.icon ?? '');
    setActivePluginMode(plugin.mode);
    setLogActive(false);
  };

  return (
    <aside className={`border-r bg-background overflow-auto fixed sm:static z-20 h-full sm:h-auto w-[78%] max-w-[280px] sm:max-w-none sm:w-[280px] transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:hidden'}`}>
      <div className="p-2 sticky top-0 bg-background z-10 border-b">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value.toLowerCase())}
          placeholder="过滤…"
          className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
        />
      </div>
      {data?.hasJust && (
        <button
          onClick={() => { onSelectLog(); setLogActive(true); setActivePluginMode(null); }}
          className={`w-full flex items-center gap-2 px-3 py-2 mx-0 my-1 text-xs border-l-2 border-transparent hover:bg-muted ${logActive ? 'bg-muted font-medium border-primary text-foreground' : 'text-foreground'}`}
        >
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span>服务日志</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">just</span>
        </button>
      )}
      {plugins.map((plugin) => {
        const isActive = activePluginMode === plugin.mode;
        return (
          <button
            key={plugin.mode}
            onClick={() => handlePluginClick(plugin)}
            className={`w-full flex items-center gap-2 px-3 py-2 mx-0 my-1 text-xs border-l-2 border-transparent hover:bg-muted ${isActive ? 'bg-muted font-medium border-primary text-foreground' : 'text-foreground'}`}
          >
            <span className="text-sm leading-none">{plugin.icon}</span>
            <span>{plugin.label}</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">{plugin.mode}</span>
          </button>
        );
      })}
      {!data ? (
        <p className="p-3 text-xs text-muted-foreground">加载中…</p>
      ) : (
        <div className="py-1">
          {tree.map(n => (
            <TreeDir key={n.name} node={n} depth={0} filter={filter} currentPath={currentPath} onSelectFile={onSelectFile} />
          ))}
          {!tree.length && <p className="p-3 text-xs text-muted-foreground">无匹配</p>}
        </div>
      )}
    </aside>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Image as ImageIcon, Terminal } from 'lucide-react';
import type { TreeNode } from '../../server/spec-scan';
import type { DashboardPlugin } from '../../server/plugins';
import type { AssetFile, AssetType } from '../../server/design-assets';

interface FilesPayload { tree: TreeNode[]; hasOpenspec: boolean; hasDocs: boolean; hasJust: boolean; hasBugs: boolean; }
type AssetsPayload = Record<AssetType, AssetFile[]>;
type SidebarData = FilesPayload | AssetsPayload | null;

const ASSET_LABELS: Record<AssetType, string> = {
  page: '页面', component: '组件', icon: '图标', token: 'Token', md: '文档',
  video: '视频', audio: '音频', pdf: 'PDF', code: '代码', font: '字体', other: '其他',
};
const ASSET_OPEN_DEFAULT: AssetType[] = ['page', 'component', 'icon', 'token', 'md', 'code'];

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

function AssetsTree({ assets, filter, currentPath, onSelectFile }: {
  assets: AssetsPayload | null; filter: string; currentPath: string | null; onSelectFile: (p: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(ASSET_OPEN_DEFAULT.map(k => [k, true])));
  if (!assets) return <p className="p-3 text-xs text-muted-foreground">加载中…</p>;
  const keys = (Object.keys(ASSET_LABELS) as AssetType[]).filter(k => (assets[k] ?? []).length);
  if (!keys.length) return <p className="p-3 text-xs text-muted-foreground">无资产</p>;
  return (
    <div className="py-1">
      {keys.map((k) => {
        const files = (assets[k] ?? []).filter(f => !filter || f.path.toLowerCase().includes(filter));
        if (!files.length) return null;
        const isOpen = open[k] !== false;
        return (
          <div key={k}>
            <button
              onClick={() => setOpen(o => ({ ...o, [k]: !isOpen }))}
              className="w-full flex items-center gap-1 px-2 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              <ChevronRight className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <span className="font-medium">{ASSET_LABELS[k]}</span>
              <span className="ml-auto pr-1 text-[10px] text-muted-foreground font-mono">{files.length}</span>
            </button>
            {isOpen && files.map((f) => (
              <button
                key={f.path}
                title={f.path}
                onClick={() => onSelectFile(f.path)}
                className={`w-full flex items-center gap-1.5 pr-2 py-1 text-xs border-l-2 border-transparent hover:bg-muted ${currentPath === f.path ? 'bg-muted font-medium border-primary' : 'text-muted-foreground'}`}
                style={{ paddingLeft: 20 }}
              >
                <FileIcon name={f.name} />
                <span className="truncate">{f.name}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function FileTree({ open: sidebarOpen, currentPath, onSelectFile, onSelectLog, onSelectPlugin, plugins, activeMode, startupMode, refreshKey }: {
  open: boolean; currentPath: string | null; onSelectFile: (p: string) => void; onSelectLog: () => void; onSelectPlugin: (mode: string, label: string, icon: string) => void; plugins: DashboardPlugin[]; activeMode: string; startupMode: string | null | undefined; refreshKey: number;
}) {
  const [data, setData] = useState<SidebarData>(null);
  const [filter, setFilter] = useState('');
  const [logActive, setLogActive] = useState(false);
  const [activePluginMode, setActivePluginMode] = useState<string | null>(null);
  useEffect(() => {
    fetch('/__files', { cache: 'no-store' }).then(r => r.json()).then(setData);
  }, [refreshKey]);
  useEffect(() => { setLogActive(false); setActivePluginMode(null); }, [currentPath]);

  // 严格隔离:启动 mode 明确时只显示该插件;未拿到配置时先不渲染(避免先全量后隔离的闪烁)
  const visiblePlugins = useMemo(
    () => startupMode === undefined ? [] : plugins.filter(p => startupMode === null || p.mode === startupMode),
    [plugins, startupMode]
  );

  const tree = useMemo(() => {
    if (startupMode === 'design') return [];
    return ((data as FilesPayload | null)?.tree ?? []).filter(n => matches(n, filter));
  }, [data, filter, startupMode]);
  const hasJust = startupMode !== 'design' && startupMode !== 'bugs' && startupMode !== 'review' && startupMode !== 'apply' && !!(data as FilesPayload | null)?.hasJust;
  const showTree = startupMode !== 'design' && startupMode !== 'bugs' && startupMode !== 'review' && startupMode !== 'apply';

  const handlePluginClick = (plugin: DashboardPlugin) => {
    onSelectPlugin(plugin.mode, plugin.label, plugin.icon ?? '');
    setActivePluginMode(plugin.mode);
    setLogActive(false);
  };

  return (
    <aside className={`border-r bg-background overflow-auto fixed z-20 h-full w-[78%] max-w-[280px] transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-2 sticky top-0 bg-background z-10 border-b">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value.toLowerCase())}
          placeholder="过滤…"
          className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
        />
      </div>
      {visiblePlugins.map((plugin) => {
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
      {hasJust && (
        <button
          onClick={() => { onSelectLog(); setLogActive(true); setActivePluginMode(null); }}
          className={`w-full flex items-center gap-2 px-3 py-2 mx-0 my-1 text-xs border-l-2 border-transparent hover:bg-muted ${logActive ? 'bg-muted font-medium border-primary text-foreground' : 'text-foreground'}`}
        >
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span>服务日志</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">just</span>
        </button>
      )}
      {startupMode === 'design' ? (
        <AssetsTree assets={data as AssetsPayload | null} filter={filter} currentPath={currentPath} onSelectFile={onSelectFile} />
      ) : startupMode === undefined ? (
        <p className="p-3 text-xs text-muted-foreground">加载中…</p>
      ) : showTree ? (
        !data ? (
          <p className="p-3 text-xs text-muted-foreground">加载中…</p>
        ) : (
          <div className="py-1">
            {tree.map(n => (
              <TreeDir key={n.name} node={n} depth={0} filter={filter} currentPath={currentPath} onSelectFile={onSelectFile} />
            ))}
            {!tree.length && <p className="p-3 text-xs text-muted-foreground">无匹配</p>}
          </div>
        )
      ) : (
        <p className="p-3 text-xs text-muted-foreground">{startupMode} 模式 · 无文件浏览</p>
      )}
    </aside>
  );
}

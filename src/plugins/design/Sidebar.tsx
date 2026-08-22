import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import { ChevronRight,
  Monitor, Blocks, Shapes, Palette, BookOpen, Video, AudioLines,
  FileText, Type, type LucideIcon,
} from 'lucide-react';
import type { AssetType } from '../../server/design-assets.js';
import { designState } from './state.js';
import { FileIcon } from '../../web/components/FileIcon.js';

interface AssetFile { path: string; name: string; ext: string; type: AssetType; }

const GROUP_ICON: Record<AssetType, LucideIcon> = {
  page: Monitor, component: Blocks, icon: Shapes, token: Palette,
  md: BookOpen, video: Video, audio: AudioLines, pdf: FileText,
  font: Type,
};

const GROUPS = [
  { key: 'page', label: '页面' }, { key: 'component', label: '组件' },
  { key: 'icon', label: '图标' }, { key: 'token', label: 'Tokens' },
  { key: 'md', label: '文档' }, { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' }, { key: 'pdf', label: 'PDF' },
  { key: 'font', label: '字体' },
] as const;

export default function Sidebar() {
  const current = useSyncExternalStore(designState.subscribe, designState.get);
  const [data, setData] = useState<Record<string, AssetFile[]> | null>(null);
  useEffect(() => { fetch('/__design/assets', { cache: 'no-store' }).then(r => r.json()).then(setData); }, []);

  const groups = useMemo(() => {
    if (!data) return [];
    return GROUPS.map(g => ({ ...g, items: data[g.key] ?? [] })).filter(g => g.items.length > 0);
  }, [data]);

  if (!data) return <p className="p-3 text-xs text-muted-foreground">加载中…</p>;

  return (
    <div>
      <div className="p-3 text-xs text-muted-foreground">{groups.reduce((s, g) => s + g.items.length, 0)} 个资产</div>
      {groups.map(g => (
        <GroupSection key={g.key} group={g} current={current} />
      ))}
    </div>
  );
}

function GroupSection({ group: g, current }: {
  group: { key: AssetType; label: string; items: AssetFile[] };
  current: { path: string; type: AssetType } | null;
}) {
  const [open, setOpen] = useState(true);
  const GIcon = GROUP_ICON[g.key];
  return (
    <div className="mb-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 mx-1 px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground rounded-md"
        style={{ width: 'calc(100% - 8px)' }}
      >
        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        {GIcon && <GIcon className="h-3.5 w-3.5 shrink-0" />}
        <span className="truncate">{g.label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 font-mono text-[10px] font-normal">{g.items.length}</span>
      </button>
      {open && g.items.map(it => (
            <button key={it.path} onClick={() => designState.set({ path: it.path, type: it.type })}
              className={`w-full text-left flex items-center gap-2 mx-1 px-2.5 py-1.5 text-xs hover:bg-muted rounded-md ${current?.path === it.path ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground'}`}
              style={{ width: 'calc(100% - 8px)' }}>
              <FileIcon name={it.name} active={current?.path === it.path} />
              <span className="truncate">{it.name}</span>
              {it.ext && <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">{it.ext}</span>}
            </button>
      ))}
    </div>
  );
}

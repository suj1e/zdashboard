import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import type { AssetType } from '../../server/design-assets.js';
import { designState } from './state.js';
import { FileIcon } from '../../web/components/FileIcon.js';
import { useIcons } from '../../web/lib/icons.js';

interface AssetFile { path: string; name: string; ext: string; type: AssetType; }

const GROUP_ICON: Record<AssetType, string> = {
  page: 'monitor', component: 'blocks', icon: 'shapes', token: 'palette',
  md: 'book-open', video: 'video', audio: 'audio-lines', pdf: 'file-text',
  font: 'type',
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
  const { icon } = useIcons();
  const GIcon = GROUP_ICON[g.key];
  return (
    <div className="mb-1.5 px-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1.5 pt-2 pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground rounded-md"
      >
        {icon('chevron-right', `h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`)}
        {GIcon && icon(GIcon as any, 'h-3.5 w-3.5 shrink-0')}
        <span className="truncate">{g.label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 font-mono text-xs font-normal">{g.items.length}</span>
      </button>
      {open && g.items.map(it => (
            <button key={it.path} onClick={() => designState.set({ path: it.path, type: it.type })}
              className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted rounded-md ${current?.path === it.path ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground'}`}>
              <FileIcon name={it.name} active={current?.path === it.path} />
              <span className="truncate">{it.name}</span>
              {it.ext && <span className="ml-auto font-mono text-xs text-muted-foreground/60">{it.ext}</span>}
            </button>
      ))}
    </div>
  );
}

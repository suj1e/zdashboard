import { useEffect, useState, useMemo, useSyncExternalStore } from 'react';
import type { AssetType } from '../../../server/design-assets.js';
import { designState } from './state.js';

interface AssetFile { path: string; name: string; ext: string; type: AssetType; }

const GROUPS = [
  { key: 'page', label: '页面' }, { key: 'component', label: '组件' },
  { key: 'icon', label: '图标' }, { key: 'token', label: 'Tokens' },
  { key: 'md', label: '文档' }, { key: 'video', label: '视频' },
  { key: 'audio', label: '音频' }, { key: 'pdf', label: 'PDF' },
  { key: 'font', label: '字体' },
  { key: 'other', label: '其他' },
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
        <div key={g.key} className="mb-1">
          <div className="px-3.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label} <span className="font-normal">{g.items.length}</span></div>
          {g.items.map(it => (
            <button key={it.path} onClick={() => designState.set({ path: it.path, type: it.type })}
              className={`w-full text-left flex items-center gap-2 px-3.5 py-1.5 text-xs border-l-2 border-transparent hover:bg-muted ${current?.path === it.path ? 'bg-muted font-medium border-primary' : 'text-muted-foreground'}`}>
              <span className="break-all">{it.name}</span><span className="font-mono text-[10px] text-muted-foreground">{it.ext}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

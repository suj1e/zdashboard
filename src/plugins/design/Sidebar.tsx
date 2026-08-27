/**
 * design 侧栏:九类资产分组树 + 多文件夹配置(manifest.config 单源)。
 * type/asset 入 URL;配置保存后 SSE config 事件触发资产重取(usePluginData subscribe)。
 */
import { useMemo, useState } from 'react';
import type { AssetType } from '../../server/design-assets.js';
import { FileIcon } from '../../web/components/FileIcon.js';
import { useIcons } from '../../web/lib/icons.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { usePluginConfig } from '../../web/hooks/usePluginConfig.js';
import { ConfigField } from '../../web/components/ConfigField.js';
import { manifest } from './manifest.js';

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
  const route = useRoute();
  const params = route.params;
  const currentAsset = params.get('asset');
  const currentType = params.get('type');
  const folderFilter = params.get('folder');

  const { icon } = useIcons();
  const [showConfig, setShowConfig] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);
  const { config, save } = usePluginConfig('design', manifest.config);

  // config 频道(SSE)到达 → 失效重取,配置 folders 增删即时生效
  const assets = usePluginData<Record<string, AssetFile[]>>('design:/__design/assets', () =>
    fetch('/__design/assets', { cache: 'no-store' }).then(r => r.json()), { subscribe: 'config' });

  const groups = useMemo(() => {
    const data = assets.data;
    if (!data) return [];
    return GROUPS
      .map(g => ({ ...g, items: (data[g.key] ?? []).filter(it => !folderFilter || it.path.startsWith(folderFilter)) }))
      .filter(g => g.items.length > 0);
  }, [assets.data, folderFilter]);

  const selectAsset = (it: AssetFile) => route.navigate({ type: it.type, asset: it.path });

  const handleConfigChange = async (key: string, value: unknown) => {
    setSavingLocal(true);
    try {
      await save({ ...config, [key]: value });
    } finally {
      setSavingLocal(false);
    }
  };

  return (
    <div>
      <div className="p-3 text-xs text-muted-foreground truncate">设计资产</div>
      {groups.map(g => (
        <GroupSection
          key={g.key}
          group={g}
          current={currentAsset && currentType === g.key ? currentAsset : null}
          onSelect={selectAsset}
        />
      ))}
      <div className="border-t border-border mt-2">
        <button
          onClick={() => setShowConfig(o => !o)}
          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <span className={`h-3 w-3 shrink-0 inline-flex items-center justify-center transition-transform ${showConfig ? 'rotate-90' : ''}`}>
            {icon('chevron-right')}
          </span>
          <span className="h-3.5 w-3.5 shrink-0 inline-flex items-center justify-center">{icon('settings')}</span>
          配置
        </button>
        {showConfig && (
          <div className="px-3 pb-3 space-y-3">
            <ConfigField key_="folders" field={manifest.config!.folders} value={config.folders} onChange={(k, v) => { void handleConfigChange(k, v); }} />
            <div className="text-xs text-muted-foreground">{savingLocal ? '保存中…' : '配置已保存'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupSection({ group: g, current, onSelect }: {
  group: { key: AssetType; label: string; items: AssetFile[] };
  current: string | null;
  onSelect: (it: AssetFile) => void;
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
        {GIcon && icon(GIcon as never, 'h-3.5 w-3.5 shrink-0')}
        <span className="truncate">{g.label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 font-mono text-xs font-normal">{g.items.length}</span>
      </button>
      {open && g.items.map(it => (
        <button key={it.path} onClick={() => onSelect(it)}
          className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-muted rounded-md ${current === it.path ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground'}`}>
          <FileIcon name={it.name} active={current === it.path} />
          <span className="truncate">{it.name}</span>
          {it.ext && <span className="ml-auto font-mono text-xs text-muted-foreground/60">{it.ext}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * design 侧栏:九类资产分组树(约定化扫描,无配置区)。
 * type/asset 入 URL;SSE files 事件触发资产重取(usePluginData subscribe)。
 */
import { useMemo, useState } from 'react';
import type { AssetType } from '../../server/design-assets.js';
import { FileIcon } from '../../web/components/FileIcon.js';
import { useIcons } from '../../web/lib/icons.js';
import { usePluginData } from '../../web/hooks/usePluginData.js';
import { useRoute } from '../../web/router.js';
import { fetchJson } from '../../web/lib/fetchJson.js';
import { safeGetItem, safeSetItem } from '../../web/lib/safeStorage.js';
import { EmptyState, ErrorState, RefreshSpinner, Skeleton } from '../../web/kit/index.js';

/** 分组展开态持久化键(JSON `Record<groupKey, boolean>`,缺省 true=展开) */
const DESIGN_GROUPS_KEY = 'zd-design-groups';

function readGroupOpen(): Record<string, boolean> {
  try {
    const raw = safeGetItem(DESIGN_GROUPS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(o)) if (typeof v === 'boolean') out[k] = v;
    return out;
  } catch {
    return {};
  }
}

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

  // files 频道(SSE)到达 → 失效重取,.zdev/design 资产变更即时生效;错误经 fetchJson 门卫传播
  const assets = usePluginData<Record<string, AssetFile[]>>('design:/__design/assets', () =>
    fetchJson<Record<string, AssetFile[]>>('/__design/assets', { cache: 'no-store' }), { subscribe: 'files' });

  const groups = useMemo(() => {
    const data = assets.data;
    if (!data) return [];
    return GROUPS
      .map(g => ({ ...g, items: (data[g.key] ?? []).filter(it => !folderFilter || it.path.startsWith(folderFilter)) }))
      .filter(g => g.items.length > 0);
  }, [assets.data, folderFilter]);

  const selectAsset = (it: AssetFile) => route.navigate({ type: it.type, asset: it.path });

  // 分组展开态单源(持久化):GroupSection 受控,缺省 true=展开
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>(readGroupOpen);
  const toggleGroup = (key: string) => {
    setGroupOpen(prev => {
      const next = { ...prev, [key]: !(prev[key] ?? true) };
      safeSetItem(DESIGN_GROUPS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 text-xs text-muted-foreground truncate flex-none flex items-center gap-2">
        设计资产
        {assets.refreshing && <RefreshSpinner />}
      </div>
      {/* 骨架仅初始加载(loading && 无数据);有数据后台刷新静默,SSE 重取不卸载旧列表 */}
      {assets.loading && !assets.data && <Skeleton rows={6} className="mx-3" />}
      {assets.error && <ErrorState message={assets.error} onRetry={assets.reload} />}
      {/* 空态引导:首次加载完成(或已有数据)且过滤后无任何分组;refetch 期间旧态不闪 */}
      {!assets.error && (assets.data || !assets.loading) && groups.length === 0 && (
        folderFilter
          ? <EmptyState title="无匹配结果" hint={`目录过滤 "${folderFilter}" 无匹配资产,调整或清空后重试`} />
          : <EmptyState title="未发现 .zdev/design 资产" hint="运行 zdesign 生成" />
      )}
      {groups.map(g => (
        <GroupSection
          key={g.key}
          group={g}
          open={groupOpen[g.key] ?? true}
          onToggle={() => toggleGroup(g.key)}
          current={currentAsset && currentType === g.key ? currentAsset : null}
          onSelect={selectAsset}
        />
      ))}
    </div>
  );
}

function GroupSection({ group: g, open, onToggle, current, onSelect }: {
  group: { key: AssetType; label: string; items: AssetFile[] };
  /** 展开态由 Sidebar 单源受控(持久化 zd-design-groups) */
  open: boolean;
  onToggle: () => void;
  current: string | null;
  onSelect: (it: AssetFile) => void;
}) {
  const { icon } = useIcons();
  const GIcon = GROUP_ICON[g.key];
  return (
    <div className="mb-1.5 px-1">
      <button
        onClick={onToggle}
        aria-expanded={open}
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

/**
 * 灵感市场工作区:三市场 Tab(Logo/动效/灵感),URL ?tab= 驱动。
 * 切换 Tab 清 q/entry(跨市场搜索词与选中项不跨语义);entry 深链接直达详情。
 */
import { PluginPage } from '../../web/kit/index.js';
import { FilterPills } from '../../web/components/FilterPills.js';
import { useIcons, useModeIcon } from '../../web/lib/icons.js';
import { useRoute } from '../../web/router.js';
import type { PluginWorkspaceProps } from '../../sdk/client.js';
import { manifest } from './manifest.js';
import { MARKET_TABS } from './urls.js';
import { MARKET_LABELS, type MarketKey } from './prompt.js';
import LogoTab from './tabs/LogoTab.js';
import MotionTab from './tabs/MotionTab.js';
import InspirationTab from './tabs/InspirationTab.js';

function isMarketTab(v: string | null): v is MarketKey {
  return MARKET_TABS.some((t) => t.key === v);
}

export default function Workspace({ params }: PluginWorkspaceProps) {
  const { icon } = useIcons();
  const themed = useModeIcon(manifest.mode, 'h-5 w-5');
  const route = useRoute();
  const tabParam = params.get('tab');
  const tab: MarketKey = isMarketTab(tabParam) ? tabParam : 'logos';
  const q = params.get('q');
  const entry = params.get('entry');

  const selectEntry = (id: string | null) => route.navigate({ entry: id ?? null });
  const switchTab = (key: string) => route.navigate({ tab: key, q: null, entry: null });
  /** 搜索/过滤词写回 URL(replace 语义,不刷历史栈);空串删键 */
  const search = (text: string) => route.navigate({ q: text || null }, { replace: true });

  return (
    <PluginPage
      manifest={manifest}
      icon={themed}
      breadcrumb={['插件', manifest.mode, MARKET_LABELS[tab], ...(entry ? [entry] : [])]}
      toolbar={
        <div className="flex items-center gap-3 flex-wrap">
          <FilterPills
            ariaLabel="市场切换"
            items={MARKET_TABS.map((t) => ({ key: t.key, label: t.label }))}
            value={tab}
            onChange={switchTab}
          />
        </div>
      }
    >
      <div className="mx-auto h-full bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">
        {tab === 'logos' && <LogoTab entry={entry} onSelect={selectEntry} q={q} onSearch={search} />}
        {tab === 'motions' && <MotionTab entry={entry} onSelect={selectEntry} />}
        {tab === 'inspirations' && <InspirationTab entry={entry} onSelect={selectEntry} />}
      </div>
    </PluginPage>
  );
}

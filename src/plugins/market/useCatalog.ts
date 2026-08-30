/**
 * 目录加载:三市场共用 usePluginData('/__market/catalog/<market>')。
 * 目录为 server 内置数据,离线可浏览(仅外部源内容加载失败)。
 */
import { usePluginData } from '../../web/hooks/usePluginData.js';

export interface CatalogState<T> {
  entries: T[];
  loading: boolean;
  error: string | null;
}

export function useCatalog<T>(market: string): CatalogState<T> {
  const { data, error, loading } = usePluginData<{ entries: T[] }>(
    `/__market/catalog/${market}`,
    async () => {
      const r = await fetch(`/__market/catalog/${market}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as { entries: T[] };
    },
  );
  return { entries: data?.entries ?? [], loading, error };
}

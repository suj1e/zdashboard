/**
 * design 资产查看器:CSS 变量 Token 解析预览。
 * 支持 .css (CSS custom properties) 与 .json (设计 token JSON)。
 */
import { useEffect, useRef, useState } from 'react';
import { fetchText, viewerFetchErrorMessage } from '../../../web/lib/fetchJson.js';
import { ErrorState } from '../../../web/kit/index.js';
import { useViewerFreshness, RefreshButton } from '../../../web/viewers/freshness.js';

interface TokenSection {
  label: string;
  items: { name: string; value: string }[];
}

const LOOKS_COLOR_VALUE = /^(#|rgb|rgba|hsl|hsla|oklch|oklab|color\()/i;
const FONT_NAME = /font|family|type/i;

function parseCssSections(text: string): TokenSection[] {
  const vars = text.match(/--[A-Za-z0-9_-]+\s*:\s*[^;}\n]+/g) ?? [];
  if (!vars.length) return [];
  const parseVal = (raw: string) => {
    const idx = raw.indexOf(':');
    const name = raw.slice(0, idx).trim();
    const value = raw.slice(idx + 1).trim();
    return { name, value };
  };
  const isColorValue = (v: string) => /^(#([0-9a-fA-F]{3,8})\b|rgb|rgba|hsl|hsla|oklch|oklab|color\()/i.test(v);
  const isFontName = (name: string) => FONT_NAME.test(name);
  const parsed = vars.map(parseVal);
  const colors = parsed.filter(p => isColorValue(p.value));
  const fonts  = parsed.filter(p => !isColorValue(p.value) && isFontName(p.name));
  const rest   = parsed.filter(p => !isColorValue(p.value) && !isFontName(p.name));
  const result: TokenSection[] = [];
  if (colors.length) result.push({ label: `配色 · ${colors.length}`, items: colors });
  if (fonts.length)  result.push({ label: `字体 · ${fonts.length}`,  items: fonts });
  if (rest.length)   result.push({ label: `其他 · ${rest.length}`,   items: rest });
  return result;
}

function parseJsonSections(text: string): TokenSection[] {
  try {
    const obj = JSON.parse(text);
    const flatten = (o: Record<string, unknown>, prefix = ''): { name: string; value: string }[] => {
      const out: { name: string; value: string }[] = [];
      for (const [k, v] of Object.entries(o)) {
        const name = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          out.push(...flatten(v as Record<string, unknown>, name));
        } else {
          out.push({ name, value: String(v) });
        }
      }
      return out;
    };
    const items = flatten(obj);
    const colors = items.filter(p => LOOKS_COLOR_VALUE.test(p.value));
    const fonts  = items.filter(p => !LOOKS_COLOR_VALUE.test(p.value) && FONT_NAME.test(p.name));
    const rest   = items.filter(p => !LOOKS_COLOR_VALUE.test(p.value) && !FONT_NAME.test(p.name));
    const result: TokenSection[] = [];
    if (colors.length) result.push({ label: `配色 · ${colors.length}`, items: colors });
    if (fonts.length)  result.push({ label: `字体 · ${fonts.length}`,  items: fonts });
    if (rest.length)   result.push({ label: `其他 · ${rest.length}`,   items: rest });
    return result;
  } catch {
    return [];
  }
}

export default function TokenViewer({ path }: { path: string }) {
  const [sections, setSections] = useState<TokenSection[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [version, refresh] = useViewerFreshness();
  const loadedPathRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pathChanged = loadedPathRef.current !== path;
    loadedPathRef.current = path;
    if (pathChanged) {
      setSections(null);
      setErr(null);
    } else if (sections === null) {
      setErr(null);
    }
    async function load() {
      try {
        const text = await fetchText('/__file-content/' + encodeURI(path), { cache: 'no-store' });
        if (cancelled) return;
        const isJson = path.toLowerCase().endsWith('.json');
        setSections(isJson ? parseJsonSections(text) : parseCssSections(text));
        setErr(null);
      } catch (e) {
        if (!cancelled) setErr(viewerFetchErrorMessage(e));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [path, version]);

  if (err && sections === null) {
    return (
      <div className="h-full flex flex-col p-4">
        <ErrorState message={err} onRetry={refresh} />
      </div>
    );
  }
  if (sections === null) return <p className="p-3 text-xs text-muted-foreground">解析中…</p>;
  if (!sections.length) return <p className="p-3 text-xs">未发现设计 Token</p>;

  return (
    <div className="relative p-8 flex flex-col gap-7">
      <div className="absolute right-6 top-4 z-10">
        <RefreshButton onClick={refresh} />
      </div>
      {sections.map(sec => {
        const hasColorItems = sec.items.some(it => LOOKS_COLOR_VALUE.test(it.value));
        const hasFontItems  = sec.items.some(it => FONT_NAME.test(it.name));
        return (
          <section key={sec.label}>
            <div className="mb-3 text-sm font-semibold uppercase text-muted-foreground">{sec.label}</div>
            {hasColorItems ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--token-card-min-w), 1fr))' }}>
                {sec.items.filter(it => LOOKS_COLOR_VALUE.test(it.value)).map(({ name, value }) => (
                  <div key={name} className="overflow-hidden rounded-lg border bg-background">
                    <div className="h-[var(--design-preview-h)] border-b" style={{ background: value }} />
                    <div className="px-2.5 pt-2 font-mono text-sm break-all">{name}</div>
                    <div className="px-2.5 pb-2 text-xs text-muted-foreground">{value}</div>
                  </div>
                ))}
              </div>
            ) : hasFontItems ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(var(--token-card-min-w), 1fr))' }}>
                {sec.items.map(({ name, value }) => (
                  <div key={name} className="overflow-hidden rounded-lg border bg-background">
                    <div className="grid h-[var(--design-preview-h)] place-items-center text-2xl" style={{ fontFamily: value }}>Aa</div>
                    <div className="px-2.5 font-mono text-sm">{name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {sec.items.map(({ name, value }) => (
                  <div key={name} className="flex justify-between gap-3 px-2.5 py-1.5 rounded border bg-background text-xs">
                    <span className="font-mono">{name}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

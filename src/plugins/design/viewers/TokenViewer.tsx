/** design 资产查看器:CSS 变量 Token 解析预览(独立文件,自 foundation Workspace 拆出) */
import { useEffect, useState } from 'react';

interface TokenSection {
  label: string;
  items: { name: string; value: string }[];
}

/** 值呈颜色字面量(#/rgb/hsl/oklch/…,渲染分区判定用) */
const LOOKS_COLOR_VALUE = /^(#|rgb|rgba|hsl|hsla|oklch|oklab|color\()/i;
/** 变量名呈字体语义(font/family/type) */
const FONT_NAME = /font|family|type/i;

export default function TokenViewer({ path }: { path: string }) {
  const [sections, setSections] = useState<TokenSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSections([]);
    fetch('/__design/asset?path=' + encodeURIComponent(path), { cache: 'no-store' })
      .then(r => r.text())
      .then(text => {
        if (cancelled) return;
        const vars = text.match(/--[A-Za-z0-9_-]+\s*:\s*[^;}\n]+/g) ?? [];
        if (!vars.length) { setSections([]); setLoading(false); return; }
        const parseVal = (raw: string) => {
          const idx = raw.indexOf(':');
          const name = raw.slice(0, idx).trim();
          const value = raw.slice(idx + 1).trim();
          return { name, value };
        };
        // 分类基于「值」而非整条声明(修正:名称含 -- 前缀,按整串判定会使配色区永不命中)
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
        setSections(result);
        setLoading(false);
      })
      .catch(() => { if (!cancelled) { setSections([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [path]);

  if (loading) return <p className="p-3 text-xs text-muted-foreground">解析中…</p>;
  if (!sections.length) return <p className="p-3 text-xs">未发现 CSS 变量</p>;

  return (
    <div className="p-8 flex flex-col gap-7">
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

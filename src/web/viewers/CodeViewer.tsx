import { useEffect, useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { formatBytes } from '../lib/utils.js';
import { fetchText, viewerFetchErrorMessage } from '../lib/fetchJson.js';
import { ErrorState } from '../kit/index.js';

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** resolve:可选整 URL 解析器(不传 = /__file-content 根路径,view 插件语义);design 插件传代理路由解析 */
export function CodeViewer({ path, resolve }: { path: string; resolve?: (p: string) => string }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const name = path.split('/').pop() || path;

  useEffect(() => {
    let alive = true;
    setText(null);
    setErr(null);
    fetchText(resolve ? resolve(path) : '/__file-content/' + encodeURI(path), { cache: 'no-store' })
      .then((t) => { if (alive) setText(t); })
      .catch((e) => { if (alive) setErr(viewerFetchErrorMessage(e)); });
    return () => { alive = false; };
  }, [path, resolve, tick]);

  if (err) {
    return (
      <div className="h-full flex flex-col p-4">
        <ErrorState message={err} onRetry={() => setTick(t => t + 1)} />
      </div>
    );
  }

  const ext = name.includes('.') ? '.' + name.split('.').pop()!.toLowerCase() : '';
  let highlighted: string;
  try {
    const result = hljs.highlight(text || '', { language: ext.slice(1) || 'plaintext', ignoreIllegals: true });
    highlighted = result.value;
  } catch {
    highlighted = text ? escHtml(text) : '';
  }

  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { console.error('[zdashboard] clipboard copy failed:', e); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none px-4 py-2 border-b text-xs flex items-center gap-3">
        <span className="font-mono text-foreground">{name}</span>
        <span className="text-muted-foreground">{formatBytes(text?.length ?? 0)}</span>
        <button
          onClick={copy}
          className="ml-auto px-2 py-0.5 rounded-[var(--radius-md)] border border-border bg-background/80 text-sm hover:bg-muted transition-colors"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {text === null ? (
          <p className="p-4 text-xs text-muted-foreground">加载中…</p>
        ) : (
          <pre className="m-0 p-4 text-xs leading-relaxed bg-terminal-bg text-terminal-fg overflow-auto">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
        )}
      </div>
    </div>
  );
}

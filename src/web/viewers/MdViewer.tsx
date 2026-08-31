import { useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';
import { fetchText, viewerFetchErrorMessage } from '../lib/fetchJson.js';
import { ErrorState } from '../kit/index.js';
import { useViewerFreshness, RefreshButton } from './freshness.js';

function CodeBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = ref.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error('[zdashboard] clipboard copy failed:', e); // 诊断保留(review S3)
      toast.error('复制失败'); // 剪贴板不可用(权限/非安全上下文):显式反馈
    }
  };
  return (
    <div className="not-prose relative my-4 group">
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 px-2 py-0.5 rounded-[var(--radius-md)] border border-border bg-background/80 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '已复制' : '复制'}
      </button>
      <pre ref={ref} className="overflow-auto rounded-[var(--radius-md)] border bg-terminal-bg p-3 text-xs leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

/** resolve:可选整 URL 解析器(不传 = /__file-content 根路径,view 插件语义);design 插件传代理路由解析 */
export function MdViewer({ path, resolve }: { path: string; resolve?: (p: string) => string }) {
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // files SSE(300ms 防抖)/手动刷新统一走版本号失效;后台重取保留旧内容,不闪「加载中」
  const [version, refresh] = useViewerFreshness();
  const loadedPathRef = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (loadedPathRef.current !== path) {
      loadedPathRef.current = path;
      setText(null);
      setErr(null);
    } else if (text === null) {
      // 无内容的重取(错误态重试/SSE 失效):先清 err 进加载态,给出过程反馈
      setErr(null);
    }
    fetchText(resolve ? resolve(path) : '/__file-content/' + encodeURI(path), { cache: 'no-store' })
      .then((t) => { if (alive) { setText(t); setErr(null); } })
      .catch((e) => { if (alive) setErr(viewerFetchErrorMessage(e)); });
    return () => { alive = false; };
  }, [path, resolve, version]);

  // 仅「无内容且失败」才全屏 ErrorState;重取失败但有旧内容 → 保留旧内容(轻提示归后续)
  if (err && text === null) {
    return (
      <div className="h-full flex flex-col p-4">
        <ErrorState message={err} onRetry={refresh} />
      </div>
    );
  }

  if (text === null) return <p className="p-3 text-xs text-muted-foreground">加载中…</p>;

  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = fmMatch?.[1] ?? null;
  const body = frontmatter ? text.slice(fmMatch![0].length) : text;

  return (
    <div className="relative">
      <div className="absolute right-6 top-4 z-10">
        <RefreshButton onClick={refresh} />
      </div>
      <div className="prose dark:prose-invert mx-auto max-w-3xl p-8 prose-headings:scroll-mt-4 prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0">
      {frontmatter && (
        <details className="not-prose mb-4 rounded-[var(--radius-md)] border p-3 text-sm">
          <summary className="cursor-pointer font-medium">YAML frontmatter</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{frontmatter}</pre>
        </details>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkFrontmatter]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['no-underline'] } }],
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          [rehypeKatex, { strict: false }],
        ]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => {
            const ext = href?.startsWith('http');
            return <a href={href} target={ext ? '_blank' : undefined} rel={ext ? 'noreferrer noopener' : undefined}>{children}</a>;
          },
        }}
      >
        {body}
      </ReactMarkdown>
      </div>
    </div>
  );
}

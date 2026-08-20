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

function CodeBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = ref.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { console.error('[zdashboard] clipboard copy failed:', e); }
  };
  return (
    <div className="not-prose relative my-4 group">
      <button
        onClick={copy}
        className="absolute right-2 top-2 z-10 px-2 py-0.5 rounded border border-border bg-background/80 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '已复制' : '复制'}
      </button>
      <pre ref={ref} className="overflow-auto rounded-md border bg-[#0d1117] p-3 text-xs leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

export function MdViewer({ path }: { path: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/' + encodeURI(path), { cache: 'no-store' })
      .then((r) => r.text())
      .then((t) => { if (alive) setText(t); })
      .catch(() => { if (alive) setText(''); });
    return () => { alive = false; };
  }, [path]);

  if (text === null) return <p className="p-3 text-xs text-muted-foreground">加载中…</p>;

  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = fmMatch?.[1] ?? null;
  const body = frontmatter ? text.slice(fmMatch![0].length) : text;

  return (
    <div className="prose dark:prose-invert mx-auto max-w-3xl p-8 prose-headings:scroll-mt-4 prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0">
      {frontmatter && (
        <details className="not-prose mb-4 rounded border p-3 text-sm">
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
  );
}

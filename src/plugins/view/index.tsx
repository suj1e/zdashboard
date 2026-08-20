import type { DashboardPlugin } from '../../server/plugins.js';
import { useEffect, useState } from 'react';
import { BookOpen, FolderOpen, FileText, Image as ImageIcon, HardDrive } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactNode } from 'react';

interface Stats {
  files: number;
  dirs: number;
  images: number;
  docs: number;
}

function ViewViewer() {
  const [stats, setStats] = useState<Stats>({ files: 0, dirs: 0, images: 0, docs: 0 });
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/__files', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;

        let files = 0;
        let dirs = 0;
        let images = 0;
        let docs = 0;

        function walk(nodes: Array<{ kind: string; name?: string; children?: unknown[] }>) {
          for (const node of nodes) {
            if (node.kind === 'file') {
              files++;
              const ext = node.name?.split('.').pop()?.toLowerCase();
              if (['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico'].includes(ext || '')) images++;
              if (['md', 'markdown'].includes(ext || '')) docs++;
            } else if (node.kind === 'dir') {
              dirs++;
              walk(node.children as Array<{ kind: string; name?: string; children?: unknown[] }> || []);
            }
          }
        }

        walk(data.tree || []);
        setStats({ files, dirs, images, docs });

        const readmeNode = (data.tree || []).find(
          (n: { kind: string; name?: string; path?: string }) => n.kind === 'file' && n.name === 'README.md'
        );
        if (readmeNode?.path) {
          const text = await fetch('/' + encodeURI(readmeNode.path), { cache: 'no-store' }).then((r) => r.text());
          if (!cancelled) setReadme(text);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold animate-pulse">z</div>
          <p>加载项目信息…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl h-full flex flex-col bg-background border rounded-lg shadow-sm overflow-hidden">
      <div className="flex-none px-4 py-3 border-b flex items-center gap-2">
        <HardDrive className="h-4 w-4" />
        <span className="text-sm font-medium">项目概览</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={<FileText className="h-5 w-5" />} label="文件" value={stats.files} />
          <StatCard icon={<FolderOpen className="h-5 w-5" />} label="目录" value={stats.dirs} />
          <StatCard icon={<ImageIcon className="h-5 w-5" />} label="图片" value={stats.images} />
          <StatCard icon={<BookOpen className="h-5 w-5" />} label="文档" value={stats.docs} />
        </div>

        {readme ? (
          <section>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" /> README
            </h3>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
            </div>
          </section>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">未找到 README.md</p>
            <p className="text-xs mt-1">使用左侧文件树浏览项目文件</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs">{icon}<span>{label}</span></div>
      <div className="text-2xl font-mono font-medium">{value}</div>
    </div>
  );
}

const plugin: DashboardPlugin = {
  mode: 'view',
  label: '项目浏览',
  icon: '👁️',
  viewer: async () => ({ default: ViewViewer }),
};

export default plugin;

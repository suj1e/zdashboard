import { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Separator } from '../components/ui/separator';
import { useSSE } from '../hooks/useSSE';

interface GitInfo { branch?: string; dirty?: number }

export function StatusBar({ projectPath, stoppedRef }: {
  projectPath: string; stoppedRef: React.MutableRefObject<boolean>;
}) {
  const [git, setGit] = useState<GitInfo>({});
  const refreshKey = useState(0)[1];
  // files 变化时重拉 /__config(分支/脏数随文件变更更新)
  useSSE(() => {}, () => refreshKey(k => k + 1), stoppedRef);
  useEffect(() => {
    fetch('/__config', { cache: 'no-store' }).then(r => r.json())
      .then(c => setGit({ branch: c.branch, dirty: c.dirty })).catch(() => {});
  }, [refreshKey]);
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const dotClass = status === 'live' ? 'bg-green-500' : status === 'lost' ? 'bg-red-500' : 'bg-muted-foreground';

  return (
    <footer className="h-6 border-t bg-background flex items-center px-2 gap-2 text-[11px] text-muted-foreground">
      <span>{host}</span>
      <Separator orientation="vertical" className="h-3" />
      <span className="truncate max-w-[240px]">{projectPath}</span>
      {git.branch && (
        <>
          <Separator orientation="vertical" className="h-3" />
          <span className="inline-flex items-center gap-1 font-mono" title={git.dirty ? `${git.dirty} 个未提交变更` : '工作区干净'}>
            <GitBranch className="h-3 w-3" />
            {git.branch}
            {git.dirty ? <span className="text-amber-600 dark:text-amber-400">●{git.dirty}</span> : <span className="text-emerald-600 dark:text-emerald-400">✓</span>}
          </span>
        </>
      )}
      <Separator orientation="vertical" className="h-3" />
      <span className="flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {status === 'live' ? 'SSE' : status === 'lost' ? '断开' : '连接中'}
      </span>
    </footer>
  );
}

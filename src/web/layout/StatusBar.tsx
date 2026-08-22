import { useEffect, useState } from 'react';
import { GitBranch, FolderOpen } from 'lucide-react';
import { useSSE } from '../hooks/useSSE';

interface GitInfo { branch?: string; dirty?: number }

const CHIP = 'inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 h-[19px] font-mono text-[10px] leading-none text-muted-foreground';

/** 底部状态条:胶囊 chip 呈现项目身份(左)与系统状态(右),与全站药丸/badge 视觉语言一致 */
export function StatusBar({ projectPath, stoppedRef }: {
  projectPath: string; stoppedRef: React.MutableRefObject<boolean>;
}) {
  const [git, setGit] = useState<GitInfo>({});
  const [version, setVersion] = useState('');
  const [bump, setBump] = useState(0);
  const status = useSSE(() => {}, () => setBump(k => k + 1), stoppedRef);

  useEffect(() => {
    fetch('/__config', { cache: 'no-store' }).then(r => r.json())
      .then(c => { setGit({ branch: c.branch, dirty: c.dirty }); setVersion(c.version ?? ''); })
      .catch(() => {});
  }, [bump]);

  const dot = status === 'live' ? 'bg-emerald-500 animate-pulse' : status === 'lost' ? 'bg-red-500' : 'bg-muted-foreground';

  return (
    <footer className="h-7 border-t bg-background flex items-center justify-between px-3 gap-2 text-[11px]">
      <div className="flex items-center gap-1.5 min-w-0">
        {projectPath && (
          <span className={`${CHIP} shrink-0`} title={projectPath}>
            <FolderOpen className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{'~' + projectPath.replace(/^\/Users\/[^/]+/, '')}</span>
          </span>
        )}
        {git.branch && (
          <span className={`${CHIP} shrink-0`} title={git.dirty ? `${git.dirty} 个未提交变更` : '工作区干净'}>
            <GitBranch className="h-3 w-3" />
            {git.branch}
            {git.dirty
              ? <span className="text-amber-600 dark:text-amber-400" title="未提交变更">● {git.dirty}</span>
              : <span className="text-emerald-600 dark:text-emerald-400">clean</span>}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {version && <span className={CHIP}>{version}</span>}
        <span className={CHIP} title={status === 'live' ? '实时推送已连接' : status === 'lost' ? '连接断开,自动重连中' : '连接中'}>
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {status === 'live' ? 'SSE' : status === 'lost' ? '重连中' : '连接中'}
        </span>
      </div>
    </footer>
  );
}

import { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { useSSE } from '../hooks/useSSE';
import { useIcons } from '../lib/icons.js';

interface GitInfo { branch?: string; dirty?: number }

const CHIP = 'inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 h-[var(--chip-h)] font-mono text-xs leading-none text-muted-foreground';

/** 底部状态条:胶囊 chip 呈现项目身份(左)与系统状态(右),与全站药丸/badge 视觉语言一致 */
export function StatusBar({ projectPath, stoppedRef }: {
  projectPath: string; stoppedRef: React.MutableRefObject<boolean>;
}) {
  const [git, setGit] = useState<GitInfo>({});
  const [version, setVersion] = useState('');
  const [bump, setBump] = useState(0);
  const status = useSSE(() => {}, () => setBump(k => k + 1), stoppedRef);
  const { icon } = useIcons();

  useEffect(() => {
    fetch('/__config', { cache: 'no-store' }).then(r => r.json())
      .then(c => { setGit({ branch: c.branch, dirty: c.dirty }); setVersion(c.version ?? ''); })
      .catch(() => {});
  }, [bump]);

  const dot = status === 'live' ? 'bg-success animate-pulse' : status === 'lost' ? 'bg-destructive' : 'bg-muted-foreground';

  return (
    <footer className="h-[var(--statusbar-h)] border-t bg-background flex items-center justify-between px-3 gap-2 text-sm">
      <div className="flex items-center gap-1.5 min-w-0">
        {projectPath && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`${CHIP} shrink-0 cursor-default`}>
                {icon('folder-open', 'h-3 w-3')}
                {projectPath.split('/').pop() || projectPath}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-xs">{projectPath}</TooltipContent>
          </Tooltip>
        )}
        {git.branch && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`${CHIP} shrink-0 cursor-default`}>
                {icon('git-branch', 'h-3 w-3')}
                {git.branch}
                {git.dirty
                  ? <span className="text-warning">● {git.dirty}</span>
                  : <span className="text-success">clean</span>}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-xs">
              {git.dirty ? `${git.dirty} 个未提交变更` : '工作区干净'}
            </TooltipContent>
          </Tooltip>
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

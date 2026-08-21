import { Separator } from './ui/separator';
import { useSSE } from '../hooks/useSSE';

export function StatusBar({ projectPath, stoppedRef }: {
  projectPath: string; stoppedRef: React.MutableRefObject<boolean>;
}) {
  const status = useSSE(() => {}, () => {}, stoppedRef);
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const dotClass = status === 'live' ? 'bg-green-500' : status === 'lost' ? 'bg-red-500' : 'bg-muted-foreground';

  return (
    <footer className="h-6 border-t bg-background flex items-center px-2 gap-2 text-[11px] text-muted-foreground">
      <span>{host}</span>
      <Separator orientation="vertical" className="h-3" />
      <span className="truncate max-w-[240px]">{projectPath}</span>
      <Separator orientation="vertical" className="h-3" />
      <span className="flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {status === 'live' ? 'SSE' : status === 'lost' ? '断开' : '连接中'}
      </span>
    </footer>
  );
}

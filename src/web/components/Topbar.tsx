import { ThemeToggle } from './ThemeToggle';
import { StopButton } from './StopButton';
import { Button } from './ui/button';
import type { ConnStatus } from '../hooks/useSSE';

export function Topbar({ status, stoppedRef, children }: {
  status: ConnStatus; stoppedRef: React.MutableRefObject<boolean>; children?: React.ReactNode;
}) {
  const dotClass = status === 'live' ? 'bg-green-500' : status === 'lost' ? 'bg-red-500' : 'bg-muted-foreground';
  return (
    <header className="h-[52px] border-b bg-background flex items-center px-3.5 gap-2">
      <strong className="text-sm font-bold tracking-tight">zdashboard</strong>
      <div className="ml-auto flex items-center gap-2">{children}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className="hidden sm:inline">{status === 'live' ? '实时' : status === 'lost' ? '已断开' : '连接中'}</span>
      </div>
      <ThemeToggle />
      <StopButton stoppedRef={stoppedRef} />
    </header>
  );
}

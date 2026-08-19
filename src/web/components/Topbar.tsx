import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { StopButton } from './StopButton';
import { Button } from './ui/button';
import type { ConnStatus } from '../hooks/useSSE';

export function Topbar({ status, stoppedRef, treeOpen, onTreeToggle, children }: {
  status: ConnStatus; stoppedRef: React.MutableRefObject<boolean>; treeOpen: boolean; onTreeToggle: () => void; children?: React.ReactNode;
}) {
  const dotClass = status === 'live' ? 'bg-green-500' : status === 'lost' ? 'bg-red-500' : 'bg-muted-foreground';
  return (
    <header className="h-[52px] border-b bg-background flex items-center px-3.5 gap-2">
      <Button variant="ghost" size="icon" onClick={onTreeToggle} aria-label="切换文件树" title="文件树(折叠/展开)">
        {treeOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </Button>
      <strong className="text-sm font-bold tracking-tight">zview</strong>
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

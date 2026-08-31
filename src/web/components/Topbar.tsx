import { ThemeToggle } from './ThemeToggle';
import { StyleSelect } from './StyleSelect';
import { StopButton } from './StopButton';
import { Button } from './ui/button';
import { CONN_DOT, CONN_TEXT, useConnStatus } from '../hooks/useConnStatus';

export function Topbar({ stoppedRef, children }: {
  stoppedRef: React.MutableRefObject<boolean>; children?: React.ReactNode;
}) {
  const status = useConnStatus();
  return (
    <header className="h-[var(--topbar-h)] border-b bg-background flex items-center px-3.5 gap-2">
      <strong className="text-sm font-bold tracking-tight">zdashboard</strong>
      <div className="ml-auto flex items-center gap-2">{children}</div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-[var(--radius-full)] ${CONN_DOT[status]}`} />
        <span className="hidden sm:inline">{CONN_TEXT[status]}</span>
      </div>
      <StyleSelect />
      <ThemeToggle />
      <StopButton stoppedRef={stoppedRef} />
    </header>
  );
}

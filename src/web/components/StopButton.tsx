import { useState } from 'react';
import { Power } from 'lucide-react';
import { Button } from './ui/button';

export function StopButton({ stoppedRef }: { stoppedRef: React.MutableRefObject<boolean> }) {
  const [stopped, setStopped] = useState(false);
  const stop = async () => {
    if (!confirm('停止预览服务?停止后需重新启动才能继续预览。')) return;
    stoppedRef.current = true;
    try {
      const cfg = await fetch('/__config').then(r => r.json());
      await fetch('/__stop', { method: 'POST', headers: { 'x-stop-token': cfg.stopToken ?? '' } });
    } catch (e) { console.error('[zdashboard] stop failed:', e); }
    setStopped(true);
  };
  if (stopped) return <div className="fixed inset-0 z-50 grid place-items-center bg-muted"><div className="text-center text-muted-foreground"><div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[14px] bg-primary text-primary-foreground text-2xl font-bold">v</div><p>预览服务已停止</p><p className="mt-1 text-xs">关闭此页,或在终端重新启动</p></div></div>;
  return <Button variant="ghost" size="icon" onClick={stop} aria-label="停止预览服务" title="停止预览服务"><Power className="h-4 w-4" /></Button>;
}

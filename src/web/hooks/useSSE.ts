import { useEffect, useRef, useState } from 'react';

export type ConnStatus = 'connecting' | 'live' | 'lost';
export function useSSE(onReload: () => void, onFiles: () => void, stoppedRef: React.MutableRefObject<boolean>) {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const esRef = useRef<EventSource | null>(null);
  useEffect(() => {
    function connect() {
      const es = new EventSource('/__reload');
      esRef.current = es;
      es.addEventListener('reload', () => onReload());
      es.addEventListener('files', () => onFiles());
      es.onopen = () => setStatus('live');
      es.onerror = () => { es.close(); if (stoppedRef.current) { setStatus('lost'); return; } setStatus('lost'); setTimeout(connect, 1500); };
    }
    connect();
    return () => esRef.current?.close();
  }, [onReload, onFiles, stoppedRef]);
  return status;
}

import { useEffect, useRef, useState } from 'react';

export type ConnStatus = 'connecting' | 'live' | 'lost';
export function useSSE(onReload: () => void, onFiles: () => void, stoppedRef: React.MutableRefObject<boolean>) {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const esRef = useRef<EventSource | null>(null);
  const onReloadRef = useRef(onReload);
  const onFilesRef = useRef(onFiles);
  useEffect(() => { onReloadRef.current = onReload; });
  useEffect(() => { onFilesRef.current = onFiles; });

  useEffect(() => {
    function connect() {
      const es = new EventSource('/__reload');
      esRef.current = es;
      es.addEventListener('reload', () => onReloadRef.current());
      es.addEventListener('files', () => onFilesRef.current());
      es.onopen = () => setStatus('live');
      es.onerror = () => { es.close(); if (stoppedRef.current) { setStatus('lost'); return; } setStatus('lost'); setTimeout(connect, 1500); };
    }
    connect();
    return () => esRef.current?.close();
  }, []);
  return status;
}

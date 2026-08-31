import { useEffect, useState } from 'react';

/**
 * 系统级「减弱动态效果」偏好(ux-low-batch T2)。
 * jsdom/旧环境无 matchMedia 时按 false 处理(保持现行动效,不因探测失败丢反馈)。
 */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => {
    try {
      return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduce;
}

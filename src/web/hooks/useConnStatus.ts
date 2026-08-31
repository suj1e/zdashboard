import { useEffect, useRef } from 'react';
import { useSSE, type ConnStatus } from './useSSE.js';

/**
 * 断线展示单源:文案与色点映射。Topbar/StatusBar 一律从这里取,
 * 禁止各自手写(历史上「已断开」vs「重连中」、destructive vs muted 打架)。
 */
export const CONN_TEXT: Record<ConnStatus, string> = { live: '实时', connecting: '连接中', lost: '重连中' };
export const CONN_DOT: Record<ConnStatus, string> = { live: 'bg-success', connecting: 'bg-muted-foreground', lost: 'bg-warning' };

/**
 * 连接状态单源钩子:所有断线指示的唯取状态口(底层即 useSSE 的模块级单例连接)。
 * @param onFiles 可选透传:断线重连后触发一次静默刷新(StatusBar git 信息重取依赖)。
 */
export function useConnStatus(onFiles?: () => void): ConnStatus {
  const ref = useRef(onFiles);
  useEffect(() => { ref.current = onFiles; });
  return useSSE(() => {}, () => ref.current?.(), undefined);
}

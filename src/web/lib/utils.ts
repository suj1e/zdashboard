import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as formatDateFns } from 'date-fns';
import { filesize as formatBytesLib } from 'filesize';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatDate(iso: string | number | Date): string {
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return String(iso);
  return formatDateFns(d, 'yyyy-MM-dd HH:mm:ss');
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  return formatBytesLib(bytes, { output: 'string', round: 1 });
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = { active: 'active', resolved: 'resolved', closed: 'closed' };
  return map[status] ?? status;
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

export function joinUrl(base: string, ...parts: string[]): string {
  const clean = (s: string) => s.replace(/\/+$/, '');
  return [clean(base), ...parts.map(s => s.replace(/^\/+/, ''))].join('/');
}

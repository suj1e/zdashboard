import { exec } from 'node:child_process';

/** 跨平台打开浏览器（macOS open / Windows start / Linux xdg-open） */
export function openUrl(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' :
    'xdg-open';
  exec(`${cmd} ${url}`);
}

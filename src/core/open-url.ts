import { exec, execFile } from 'node:child_process';

/** 跨平台打开浏览器（macOS open / Windows start / Linux xdg-open） */
export function openUrl(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' :
    process.platform === 'win32' ? 'start' :
    'xdg-open';
  // win32 `start` 是 shell 内建命令，只能走 shell；其他平台直接用 execFile
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`);
  } else {
    execFile(cmd, [url]);
  }
}

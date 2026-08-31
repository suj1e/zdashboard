/**
 * 单行日志渲染:抽为 memo 组件,key 用随行存入的单调 seq(窗口滑动截断不引起键位错动),
 * 合批追加时旧行 props 引用不变 → 零重渲。
 */
import { memo } from 'react';
import Ansi from 'ansi-to-react';
import { levelClass, splitHighlight } from '../lib/log-viewer.js';

export interface LogLineData { seq: number; text: string }

export const LogLine = memo(function LogLine({ line, query = '' }: { line: LogLineData; query?: string }) {
  const text = line.text.replace(/\r?\n$/, '');
  const segs = query ? splitHighlight(text, query) : null;
  return (
    <div className="whitespace-pre-wrap break-all min-h-[1.25rem]">
      {/\x1b\[/.test(text)
        ? <Ansi>{text}</Ansi>
        : segs
          ? segs.map((s, i) => s.hit
            ? <mark key={i} className="bg-warning/40 text-inherit">{s.text}</mark>
            : <span key={i} className={levelClass(text)}>{s.text}</span>)
          : <span className={levelClass(text)}>{text}</span>}
    </div>
  );
});

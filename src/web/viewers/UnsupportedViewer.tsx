import { FileQuestion } from 'lucide-react';
export function UnsupportedViewer({ path }: { path: string }) {
  return <div className="grid place-items-center h-full text-center text-muted-foreground">
    <div><FileQuestion className="h-10 w-10 mx-auto mb-3 opacity-50" /><p>该格式无法预览</p><p className="mt-1 font-mono text-xs break-all">{path}</p></div>
  </div>;
}

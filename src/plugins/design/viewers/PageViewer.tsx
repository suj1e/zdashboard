/** design 资产查看器:页面 iframe 预览(独立文件,自 foundation Workspace 拆出) */
export default function PageViewer({ path }: { path: string }) {
  return <iframe src={'/__design/asset?path=' + encodeURIComponent(path)} title="预览" className="w-full h-full border-0 bg-white" />;
}

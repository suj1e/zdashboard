/**
 * view 工作区:左预览右 OutlineNav,文件由 URL ?file= 驱动(深链接直达)。
 * 面包屑 PageHeader 携带 worktree/路径;空态走 kit EmptyState。
 */
import { useRef } from 'react';
import { MdViewer } from '../../web/viewers/MdViewer.js';
import { ImageViewer } from '../../web/viewers/ImageViewer.js';
import { CodeViewer } from '../../web/viewers/CodeViewer.js';
import { UnsupportedViewer } from '../../web/viewers/UnsupportedViewer.js';
import OutlineNav from './OutlineNav.js';
import { EmptyState, PluginPage } from '../../web/kit/index.js';
import { useIcons, useModeIcon } from '../../web/lib/icons.js';
import type { PluginWorkspaceProps } from '../../sdk/client.js';
import { manifest } from './manifest.js';

function viewerFor(path: string) {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  if (name === 'justfile' || name === 'makefile') return CodeViewer;
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  if (ext === '.md' || ext === '.markdown') return MdViewer;
  if (['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'].includes(ext)) return ImageViewer;
  if (['.sql', '.txt', '.csv', '.tsv', '.json', '.yaml', '.yml', '.xml', '.py', '.js', '.ts', '.java', '.go', '.rs', '.rb', '.php', '.c', '.cpp', '.h', '.cs', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.fish', '.env', '.gitignore', '.dockerfile'].includes(ext)) return CodeViewer;
  return UnsupportedViewer;
}

export default function Workspace({ params }: PluginWorkspaceProps) {
  const { icon } = useIcons();
  const themed = useModeIcon(manifest.mode, 'h-5 w-5');
  const file = params.get('file');
  const wt = params.get('wt');
  const contentRef = useRef<HTMLDivElement>(null);
  const Viewer = file ? viewerFor(file) : null;

  return (
    <PluginPage
      manifest={manifest}
      icon={themed}
      breadcrumb={['插件', wt ?? '当前分支', ...(file ? [file] : [])]}
    >
      <div className="mx-auto h-full max-w-5xl bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">
        {file && Viewer ? (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <div ref={contentRef} className="flex-1 min-h-0 overflow-auto">
              <Viewer path={file} />
            </div>
            <OutlineNav containerRef={contentRef} />
          </div>
        ) : (
          <EmptyState icon={icon('eye', 'h-6 w-6')} title="从左侧选择文件预览" hint="支持 Markdown、图片、代码等格式" />
        )}
      </div>
    </PluginPage>
  );
}

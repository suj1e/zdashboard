/**
 * design 资产查看器注册表:资产类型 → 查看器组件(独立模块,便于单测)。
 */
import type { ComponentType } from 'react';
import type { AssetType } from '../../../server/design-assets.js';
import PageViewer from './PageViewer.js';
import TokenViewer from './TokenViewer.js';
import { MdViewer, ImageViewer, CodeViewer, VideoViewer, AudioViewer, PdfViewer, FontViewer, DiagramViewer, UnsupportedViewer } from './misc.js';

export { UnsupportedViewer };

export const ASSET_VIEWER_TYPES: readonly AssetType[] = ['page', 'component', 'icon', 'token', 'md', 'video', 'audio', 'pdf', 'font', 'diagram'];

const VIEWERS: Partial<Record<AssetType, ComponentType<{ path: string }>>> = {
  page: PageViewer, icon: ImageViewer, token: TokenViewer, md: MdViewer,
  video: VideoViewer, audio: AudioViewer, pdf: PdfViewer,
  component: CodeViewer, font: FontViewer,
  diagram: DiagramViewer,
};

export function selectViewer(type: string): ComponentType<{ path: string }> {
  return VIEWERS[type as AssetType] ?? UnsupportedViewer;
}

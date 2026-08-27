import type { ReactNode } from 'react';
import type { PluginManifest } from '../../core/manifest.js';
import { PageHeader } from './PageHeader.js';
import { Toolbar } from './Toolbar.js';
import { AsyncBoundary, type AsyncState } from './AsyncBoundary.js';
import type { ChipTone } from './Chip.js';

/**
 * 插件页模板:PageHeader + (可选 Toolbar) + (可选 AsyncBoundary) + children。
 * 插件内容自由;icon 调用方经 useIcons mode→icon 映射注入(不写死 emoji)。
 */
export function PluginPage({ manifest, icon, breadcrumb, status, actions, toolbar, state, children }: {
  manifest: Pick<PluginManifest, 'mode' | 'label' | 'description'>;
  icon?: ReactNode;
  breadcrumb?: readonly string[];
  status?: { label: string; tone?: ChipTone };
  actions?: ReactNode;
  toolbar?: ReactNode;
  state?: AsyncState;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col h-full" data-plugin-page={manifest.mode}>
      <PageHeader
        icon={icon}
        title={manifest.label}
        breadcrumb={breadcrumb ?? [manifest.mode]}
        status={status}
        actions={actions}
      />
      {toolbar && <Toolbar>{toolbar}</Toolbar>}
      <div className="flex-1 min-h-0">
        {state ? (
          <AsyncBoundary {...state}>{children}</AsyncBoundary>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

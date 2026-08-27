import { describe, it, expect, expectTypeOf } from 'vitest';
import React, { lazy } from 'react';
import { defineWebPlugin } from '../client.js';
import type { ParamSchema } from '../shared.js';

const manifest = {
  mode: 'myplug',
  label: 'My Plug',
  icon: 'X',
  description: 'desc',
};

describe('defineWebPlugin', () => {
  it('manifest 字段经 PlatformWebPlugin 形态完整透传', () => {
    const Workspace = lazy(() => Promise.resolve({ default: () => null }));
    const wp = defineWebPlugin({ manifest, workspace: Workspace });
    expect(wp.manifest.mode).toBe('myplug');
    expect(wp.manifest.label).toBe('My Plug');
    expect(wp.manifest.icon).toBe('X');
    expect(wp.manifest.description).toBe('desc');
    expect(wp.workspace).toBe(Workspace);
    expect(wp.sidebar).toBeUndefined();
    expect(wp.params).toBeUndefined();
  });

  it('sidebar 与 params 可选传入且原样保留', () => {
    const Workspace = lazy(() => Promise.resolve({ default: () => null }));
    const Sidebar = lazy(() => Promise.resolve({ default: () => null }));
    const params: ParamSchema = [{ name: 'file', label: '文件', type: 'string' }];
    const wp = defineWebPlugin({ manifest, workspace: Workspace, sidebar: Sidebar, params });
    expect(wp.sidebar).toBe(Sidebar);
    expect(wp.params).toEqual(params);
  });

  it('类型强制:workspace 必须是 LazyExoticComponent', () => {
    const Workspace = lazy(() => Promise.resolve({ default: () => null }));
    const wp = defineWebPlugin({ manifest, workspace: Workspace });
    expectTypeOf(wp.workspace).toEqualTypeOf<
      React.LazyExoticComponent<React.ComponentType<{ params: URLSearchParams }>>
    >();
    // 非法:静态(非 lazy)组件必须被类型拒绝
    const StaticWorkspace = () => null;
    // @ts-expect-error — defineWebPlugin 强制 lazy workspace
    defineWebPlugin({ manifest, workspace: StaticWorkspace });
  });
});

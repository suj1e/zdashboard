/**
 * 灵感目录:真实开源站点/设计模式精选(v1 40 条)。
 * 仅元数据(name/desc/url/tags),详情新窗口打开原站,不做内嵌(第三方站点不可 iframe)。
 */
export interface InspirationEntry {
  id: string;
  name: string;
  desc: string;
  url: string;
  tags: string[];
}

export const INSPIRATIONS: InspirationEntry[] = [
  { id: 'shadcn', name: 'shadcn/ui', desc: '可复制粘贴的 React 组件集,代码归你所有', url: 'https://ui.shadcn.com', tags: ['react', 'tailwind', '设计系统'] },
  { id: 'radix', name: 'Radix UI', desc: '无样式可访问性 React 基础组件', url: 'https://www.radix-ui.com', tags: ['react', '无障碍', '基础组件'] },
  { id: 'tailwindcss', name: 'Tailwind CSS', desc: '原子化 CSS 框架的官方站点', url: 'https://tailwindcss.com', tags: ['css', '原子化', '官网'] },
  { id: 'antd', name: 'Ant Design', desc: '企业级 React 设计系统与组件库', url: 'https://ant.design', tags: ['react', '设计系统', '企业级'] },
  { id: 'arco', name: 'Arco Design', desc: '字节跳动企业级设计系统', url: 'https://arco.design', tags: ['react', '设计系统', '企业级'] },
  { id: 'semi', name: 'Semi Design', desc: '抖音前端团队设计系统', url: 'https://semi.design', tags: ['react', '设计系统', '主题化'] },
  { id: 'chakra', name: 'Chakra UI', desc: '以无障碍和主题著称的 React 组件库', url: 'https://chakra-ui.com', tags: ['react', '无障碍', '主题'] },
  { id: 'mui', name: 'MUI', desc: 'Material Design 风格 React 组件库', url: 'https://mui.com', tags: ['react', 'material', '组件库'] },
  { id: 'mantine', name: 'Mantine', desc: '组件+hooks 齐全的 React 全家桶', url: 'https://mantine.dev', tags: ['react', '组件库', 'hooks'] },
  { id: 'naiveui', name: 'Naive UI', desc: 'Vue 3 全类型组件库,主题定制细', url: 'https://www.naiveui.com', tags: ['vue', '组件库', '主题'] },
  { id: 'element-plus', name: 'Element Plus', desc: 'Vue 3 老牌企业级组件库', url: 'https://element-plus.org', tags: ['vue', '组件库', '企业级'] },
  { id: 'daisyui', name: 'daisyUI', desc: 'Tailwind 语义化组件类与多主题', url: 'https://daisyui.com', tags: ['tailwind', 'css', '主题'] },
  { id: 'nextui', name: 'NextUI', desc: '美观优先的 React + Tailwind 组件库', url: 'https://nextui.org', tags: ['react', 'tailwind', '组件库'] },
  { id: 'headlessui', name: 'Headless UI', desc: '完全无样式、带行为的 React/Vue 组件', url: 'https://headlessui.com', tags: ['react', 'vue', '无样式'] },
  { id: 'carbon', name: 'Carbon Design System', desc: 'IBM 开源设计系统,token 体系教科书', url: 'https://carbondesignsystem.com', tags: ['设计系统', 'token', '文档'] },
  { id: 'polaris', name: 'Polaris', desc: 'Shopify 设计系统,电商后台范式', url: 'https://polaris.shopify.com', tags: ['设计系统', 'react', '电商'] },
  { id: 'material3', name: 'Material Design 3', desc: 'Google 动态取色与形变设计规范', url: 'https://m3.material.io', tags: ['google', '设计系统', '动效'] },
  { id: 'storybook', name: 'Storybook', desc: '组件工作台与文档的事实标准', url: 'https://storybook.js.org', tags: ['组件文档', '工作台', '协作'] },
  { id: 'geist', name: 'Geist', desc: 'Vercel 极简设计系统', url: 'https://vercel.com/geist', tags: ['设计系统', '极简', 'vercel'] },
  { id: 'openprops', name: 'Open Props', desc: '超实用 CSS 变量集合(动效/颜色/布局)', url: 'https://open-props.style', tags: ['css', '变量', '动效'] },
  { id: 'everylayout', name: 'Every Layout', desc: '用 CSS 原生能力解决布局问题', url: 'https://every-layout.dev', tags: ['css', '布局', '响应式'] },
  { id: 'animatecss', name: 'Animate.css', desc: '最流行的即用型 CSS 动画库官网', url: 'https://animate.style', tags: ['css', '动效', '库'] },
  { id: 'csstricks', name: 'CSS-Tricks', desc: 'CSS 技巧与模式的长青社区', url: 'https://css-tricks.com', tags: ['css', '教程', '模式'] },
  { id: 'webdev', name: 'web.dev', desc: 'Google Web 最佳实践与性能指南', url: 'https://web.dev', tags: ['性能', '最佳实践', 'google'] },
  { id: 'excalidraw', name: 'Excalidraw', desc: '手绘风协作白板,开源虚拟白板标杆', url: 'https://excalidraw.com', tags: ['白板', '手绘风', '协作'] },
  { id: 'tldraw', name: 'tldraw', desc: '无限画布 SDK 与精美白板', url: 'https://www.tldraw.com', tags: ['白板', '画布', 'sdk'] },
  { id: 'penpot', name: 'Penpot', desc: '开源 Figma 替代,设计开发同源', url: 'https://penpot.app', tags: ['设计工具', '开源', '协作'] },
  { id: 'cal', name: 'Cal.com', desc: '开源日程预约,产品站与交互范式', url: 'https://cal.com', tags: ['saas', '日程', '表单'] },
  { id: 'dub', name: 'Dub', desc: '开源短链平台,现代 SaaS 界面范本', url: 'https://dub.co', tags: ['saas', '短链', '分析'] },
  { id: 'twenty', name: 'Twenty', desc: '开源 Notion 风 CRM,表格交互教科书', url: 'https://twenty.com', tags: ['crm', '表格', 'saas'] },
  { id: 'umami', name: 'Umami', desc: '隐私友好的开源站点统计,仪表盘简洁', url: 'https://umami.is', tags: ['统计', '隐私', '仪表盘'] },
  { id: 'plausible', name: 'Plausible', desc: '极简开源分析,一屏仪表盘范式', url: 'https://plausible.io', tags: ['统计', '隐私', '极简'] },
  { id: 'outline', name: 'Outline', desc: '开源团队 wiki,排版与快捷键体验佳', url: 'https://www.getoutline.com', tags: ['文档', 'wiki', '团队'] },
  { id: 'plane', name: 'Plane', desc: '开源项目管理,issue/看板/周期', url: 'https://plane.so', tags: ['项目管理', '看板', 'issue'] },
  { id: 'huly', name: 'Huly', desc: '开源全栈项目管理,视觉华丽', url: 'https://huly.io', tags: ['项目管理', '视觉', '全栈'] },
  { id: 'uptime-kuma', name: 'Uptime Kuma', desc: '自托管监控与状态页', url: 'https://uptime.kuma.pet', tags: ['监控', '状态页', '自托管'] },
  { id: 'homepage', name: 'Homepage', desc: '现代化自托管导航仪表盘', url: 'https://gethomepage.dev', tags: ['仪表盘', '导航', '自托管'] },
  { id: 'nocodb', name: 'NocoDB', desc: '开源 Airtable 替代,数据库表格化', url: 'https://nocodb.com', tags: ['数据库', '表格', '低代码'] },
  { id: 'bruno', name: 'Bruno', desc: '离线优先开源 API 客户端', url: 'https://www.usebruno.com', tags: ['api', '离线优先', '开发工具'] },
  { id: 'grafana', name: 'Grafana', desc: '开源可视化监控面板标杆', url: 'https://grafana.com/oss/grafana/', tags: ['监控', '可视化', '仪表盘'] },
];

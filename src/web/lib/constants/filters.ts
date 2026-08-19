export const STATUS_FILTERS = [
  { key: 'mine', label: '我的' },
  { key: 'all', label: '全部' },
  { key: 'active', label: 'active' },
  { key: 'resolved', label: 'resolved' },
  { key: 'closed', label: 'closed' },
] as const;

export const SEVERITY_LEVELS = [
  { value: 1, label: '致命', className: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  { value: 2, label: '严重', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { value: 3, label: '一般', className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500' },
  { value: 4, label: '轻微', className: 'bg-muted text-muted-foreground' },
] as const;

export const PLUGIN_MODES = ['view', 'bugs', 'review'] as const;

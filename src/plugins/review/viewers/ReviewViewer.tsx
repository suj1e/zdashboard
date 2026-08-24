import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSSE } from '../../../web/hooks/useSSE.js';
import { useIcons } from '../../../web/lib/icons.js';
import { Badge } from '../../../web/components/ui/badge.js';
import { Button } from '../../../web/components/ui/button.js';
import { Card } from '../../../web/components/ui/card.js';
import { ScrollArea } from '../../../web/components/ui/scroll-area.js';
import { Separator } from '../../../web/components/ui/separator.js';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../web/components/ui/tooltip.js';

type ItemState = 'open' | 'answered' | 'accepted' | 'dismissed';
type ItemType = 'question' | 'conflict' | 'gap' | 'ambiguity' | 'decomposition';
type Priority = 'high' | 'medium' | 'low';
type Severity = 'high' | 'medium' | 'low';

interface ReviewItem {
  id: string;
  type: ItemType;
  severity?: Severity;
  state: ItemState;
  title: string;
  question?: string;
  answer?: string;
  doc?: string;
  context?: string;
  sources?: Array<{ doc: string; quote: string }>;
  priority?: Priority;
  children?: ReviewItem[];
}

interface ReviewDocument {
  id: string;
  path: string;
  title: string;
  type: string;
  parsedAt: string;
}

interface ReviewCodebase {
  id: string;
  path: string;
  title: string;
  type: string;
  summary: string;
}

interface ReviewDiagram {
  path: string;
  title: string;
  type: string;
}

interface ReviewData {
  status: string;
  summary: string;
  documents: ReviewDocument[];
  codebases: ReviewCodebase[];
  diagrams: ReviewDiagram[];
  items: ReviewItem[];
}

const TYPE_CONFIG: Record<ItemType, { label: string; icon: string; color: string; bgColor: string }> = {
  conflict:     { label: '冲突',     icon: '⚠️', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  gap:          { label: '缺口',     icon: '🔍', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/30' },
  ambiguity:    { label: '歧义',     icon: '❓', color: 'text-yellow-600 dark:text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  decomposition:{ label: '拆解',     icon: '📋', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
  question:     { label: '问题',     icon: '💬', color: 'text-muted-foreground', bgColor: 'bg-muted border-border' },
};

const SEV_COLOR: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-orange-400',
  low: 'border-l-blue-400',
};

const STATE_BADGE: Record<ItemState, string> = {
  open: 'bg-destructive/15 text-destructive border-destructive/30',
  answered: 'bg-info/15 text-info border-info/30',
  accepted: 'bg-success/15 text-success border-success/30',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

const STATE_TEXT: Record<ItemState, string> = {
  open: '待处理',
  answered: '已答复',
  accepted: '已采纳',
  dismissed: '已驳回',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  high: 'text-red-600 dark:text-red-400',
  medium: 'text-orange-600 dark:text-orange-400',
  low: 'text-muted-foreground',
};

// --- Tree Node Component for Decomposition ---
function DecompositionNode({ item, depth, onUpdate, onAddChild, onRemove, token }: {
  item: ReviewItem;
  depth: number;
  onUpdate: (id: string, patch: { title?: string; priority?: Priority; state?: ItemState; answer?: string }) => void;
  onAddChild: (parentId: string, title: string, priority: Priority) => void;
  onRemove: (id: string) => void;
  token: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [newChildPriority, setNewChildPriority] = useState<Priority>('medium');
  const { icon } = useIcons();

  useEffect(() => { setEditTitle(item.title); }, [item.title]);

  const post = async (body: object) => {
    const r = await fetch('/__review/item', {
      method: 'POST',
      headers: { 'x-stop-token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, ...body }),
    });
    if (r.ok) {
      const data = await r.json();
      // Trigger parent reload via custom event
      window.dispatchEvent(new CustomEvent('zd-dashboard-reload'));
    }
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== item.title) {
      post({ title: editTitle.trim() });
    }
    setEditing(false);
  };

  const handleAddChild = () => {
    if (newChildTitle.trim()) {
      onAddChild(item.id, newChildTitle.trim(), newChildPriority);
      setNewChildTitle('');
      setShowAddChild(false);
    }
  };

  const handleRemove = () => {
    if (confirm(`确定删除 "${item.title}"？子项将一并删除。`)) {
      onRemove(item.id);
    }
  };

  const togglePriority = () => {
    const next: Record<Priority, Priority> = { high: 'medium', medium: 'low', low: 'high' };
    post({ priority: next[item.priority ?? 'medium'] });
  };

  return (
    <div className={`border-l-2 ${SEV_COLOR[item.severity ?? 'low']} pl-3 py-1`}>
      <div className="flex items-center gap-2 py-1.5 group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          {item.children && item.children.length > 0 ? (
            <span className="text-xs text-muted-foreground">{expanded ? '▼' : '▶'}</span>
          ) : (
            <span className="text-xs text-muted-foreground">•</span>
          )}
        </button>
        <span className={`text-sm font-medium flex-1 ${editing ? 'hidden' : ''}`}>{item.title}</span>
        {editing && (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            className="flex-1 text-sm px-2 py-0.5 rounded border border-border bg-background focus:outline-none focus:border-primary"
          />
        )}
        <span className={`text-xs font-mono ${PRIORITY_COLOR[item.priority ?? 'medium']}`}>
          [{item.priority ?? 'medium'}]
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={togglePriority} className="h-6 px-1.5 rounded text-xs hover:bg-muted">优先级</button>
            </TooltipTrigger>
            <TooltipContent>切换优先级</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setEditing(!editing)} className="h-6 px-1.5 rounded text-xs hover:bg-muted">改名</button>
            </TooltipTrigger>
            <TooltipContent>修改名称</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setShowAddChild(!showAddChild)} className="h-6 px-1.5 rounded text-xs hover:bg-muted">+子项</button>
            </TooltipTrigger>
            <TooltipContent>添加子项</TooltipContent>
          </Tooltip>
          {depth > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleRemove} className="h-6 px-1.5 rounded text-xs hover:bg-destructive/10 text-destructive">删除</button>
              </TooltipTrigger>
              <TooltipContent>删除此项</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {showAddChild && (
        <div className="ml-6 mb-2 flex items-center gap-2">
          <input
            autoFocus
            value={newChildTitle}
            onChange={(e) => setNewChildTitle(e.target.value)}
            placeholder="子项名称"
            onKeyDown={(e) => e.key === 'Enter' && handleAddChild()}
            className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background focus:outline-none focus:border-primary"
          />
          <select
            value={newChildPriority}
            onChange={(e) => setNewChildPriority(e.target.value as Priority)}
            className="text-xs px-2 py-1 rounded border border-border bg-background"
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <button onClick={handleAddChild} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90">添加</button>
          <button onClick={() => setShowAddChild(false)} className="text-xs px-2 py-1 rounded hover:bg-muted">取消</button>
        </div>
      )}
      {expanded && item.children && item.children.length > 0 && (
        <div className="ml-2 border-l border-border/50">
          {item.children.map((child) => (
            <DecompositionNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              onRemove={onRemove}
              token={token}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main ReviewViewer ---
export default function ReviewViewer() {
  const { icon } = useIcons();
  const [data, setData] = useState<ReviewData | null>(null);
  const [docs, setDocs] = useState<string[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<string | null>(null);
  const stopped = useRef(false);

  const reload = useCallback(() => {
    fetch('/__review', { cache: 'no-store' }).then(r => r.json()).then(setData);
    fetch('/__docs', { cache: 'no-store' }).then(r => r.json()).then((ds: string[]) => {
      setDocs(ds);
      setSelectedDoc(cur => (cur && ds.includes(cur) ? cur : ds[0] ?? null));
    });
  }, []);

  useEffect(() => {
    reload();
    fetch('/__config').then(r => r.json()).then(c => setToken(c.stopToken ?? ''));
    const handler = () => reload();
    window.addEventListener('zd-dashboard-reload', handler);
    return () => window.removeEventListener('zd-dashboard-reload', handler);
  }, [reload]);

  useSSE(() => {}, reload, stopped);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, conflict: 0, gap: 0, ambiguity: 0, decomposition: 0, question: 0, codebases: 0 };
    const walk = (items: ReviewItem[]) => {
      for (const i of items) {
        c.all++;
        c[i.type]++;
        if (i.children) walk(i.children);
      }
    };
    if (data?.items) walk(data.items);
    if (data?.codebases) c.codebases = data.codebases.length;
    return c;
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const walk = (items: ReviewItem[]): ReviewItem[] => {
      const out: ReviewItem[] = [];
      for (const i of items) {
        if (typeFilter === 'all' || i.type === typeFilter) out.push(i);
        if (i.children) out.push(...walk(i.children));
      }
      return out;
    };
    return walk(data.items);
  }, [data, typeFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ReviewItem[]>();
    for (const i of filteredItems) {
      const type = i.type;
      if (!groups.has(type)) groups.set(type, []);
      groups.get(type)!.push(i);
    }
    return groups;
  }, [filteredItems]);

  const post = async (body: object) => {
    setSaving(true);
    try {
      const r = await fetch('/__review/item', {
        method: 'POST',
        headers: { 'x-stop-token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const newData = await r.json();
        setData(newData);
      } else {
        setErr((await r.json()).error ?? 'failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddChild = async (parentId: string, title: string, priority: Priority) => {
    await post({ parentId, title, priority });
  };

  const handleRemove = async (id: string) => {
    await post({ id, _action: 'remove' });
  };

  const handlePass = async () => {
    setErr('');
    const r = await fetch('/__review/status', {
      method: 'POST',
      headers: { 'x-stop-token': token, 'Content-Type': 'application/json' },
      body: '{"status":"passed"}',
    });
    if (r.ok) setData(await r.json());
    else setErr((await r.json()).error ?? 'failed');
  };

  const openCount = useMemo(() => {
    let n = 0;
    const walk = (items: ReviewItem[]) => { for (const i of items) { if (i.state === 'open') n++; if (i.children) walk(i.children); } };
    if (data?.items) walk(data.items);
    return n;
  }, [data]);

  // --- Render Item Card ---
  const renderItemCard = (item: ReviewItem) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.question;
    const done = item.state === 'accepted' || item.state === 'dismissed';

    return (
      <Card key={item.id} className={`mb-3 border-l-4 ${SEV_COLOR[item.severity ?? 'low']} ${config.bgColor}`}>
        <div className="flex items-center gap-2 px-3 pt-2.5 text-sm">
          <span>{config.icon}</span>
          <span className="font-medium text-xs uppercase tracking-wide">{config.label}</span>
          {item.severity && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {item.severity === 'high' ? '高' : item.severity === 'medium' ? '中' : '低'}
            </Badge>
          )}
          {item.priority && item.type === 'decomposition' && (
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${PRIORITY_COLOR[item.priority]}`}>
              优先级:{item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
            </Badge>
          )}
          <span className={`ml-auto px-1.5 py-0.5 rounded border text-xs font-medium ${STATE_BADGE[item.state]}`}>
            {STATE_TEXT[item.state]}
          </span>
        </div>
        <div className="px-3 py-2">
          <h4 className="text-sm font-medium mb-1">{item.title}</h4>
          {item.question && <p className="text-xs text-muted-foreground mb-2">{item.question}</p>}
          {item.context && (
            <div className="text-xs bg-background/50 rounded p-2 mb-2 border border-border/50">
              <span className="text-muted-foreground">背景:</span> {item.context}
            </div>
          )}
          {item.sources && item.sources.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">来源引用:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {item.sources.map((src, idx) => (
                  <div key={idx} className="text-xs bg-background rounded p-2 border border-border/50">
                    <span className="font-medium text-xs text-primary">{src.doc}</span>
                    <p className="mt-1 text-muted-foreground italic">"{src.quote}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {item.answer && (
            <div className="text-xs bg-success/10 rounded p-2 mb-2 border border-success/20">
              <span className="font-medium text-success">答复:</span> {item.answer}
            </div>
          )}
          {item.type === 'decomposition' && item.children && item.children.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">子项:</p>
              <DecompositionNode
                item={item}
                depth={0}
                onUpdate={(id, patch) => post({ id, ...patch })}
                onAddChild={handleAddChild}
                onRemove={handleRemove}
                token={token}
              />
            </div>
          )}
          {item.type === 'decomposition' && (!item.children || item.children.length === 0) && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddChild(item.id, '新子项', 'medium')}
                className="text-xs h-7"
              >
                + 添加子项
              </Button>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            {item.type !== 'decomposition' && (
              <>
                {!done ? (
                  <>
                    <Button size="sm" onClick={() => post({ state: 'answered' })} className="h-7 text-xs">
                      答复
                    </Button>
                    <Button size="sm" variant="default" onClick={() => post({ state: 'accepted' })} className="h-7 text-xs bg-success hover:bg-success text-white">
                      采纳
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => post({ state: 'dismissed' })} className="h-7 text-xs">
                      驳回
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => post({ state: 'open' })} className="h-7 text-xs">
                    撤销
                  </Button>
                )}
              </>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {done ? (item.state === 'accepted' ? '已采纳 — 可撤销后重新处理' : '已驳回 — 可撤销后重新处理') : '处理后可采纳或驳回'}
            </span>
          </div>
        </div>
      </Card>
    );
  };

  // --- Render ---
  return (
    <div className="h-full flex flex-col">
      {/* Summary Card */}
      {data?.summary && (
        <Card className="mx-auto w-full max-w-6xl mb-4">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">📋 预审摘要</span>
              <span className="text-xs text-muted-foreground">{data.summary}</span>
            </div>
            <span className="text-xs text-muted-foreground">{summaryOpen ? '收起' : '展开'}</span>
          </button>
          {summaryOpen && (
            <div className="px-4 pb-3 text-xs text-muted-foreground border-t border-border/50 pt-2">
              {data.summary}
              <div className="mt-2 flex items-center gap-3">
                <span className="text-red-600 dark:text-red-400">● 冲突: {counts.conflict}</span>
                <span className="text-orange-600 dark:text-orange-400">● 缺口: {counts.gap}</span>
                <span className="text-yellow-600 dark:text-yellow-500">● 歧义: {counts.ambiguity}</span>
                <span className="text-blue-600 dark:text-blue-400">● 拆解: {counts.decomposition}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="flex-1 min-h-0 flex gap-4">
        {/* Left Sidebar: Documents + Type Filters */}
        <aside className="w-64 flex-none border-r bg-background rounded-lg overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">文档列表</h3>
              <div className="space-y-1">
                {docs.map((doc) => (
                  <button
                    key={doc}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors ${
                      selectedDoc === doc ? 'bg-muted font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    📄 {doc}
                  </button>
                ))}
              </div>
            </div>
            <Separator />
            <div className="p-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">类型筛选</h3>
              <div className="space-y-1">
                {(['all', 'conflict', 'gap', 'ambiguity', 'decomposition'] as const).map((type) => {
                  const config = type === 'all' ? { label: '全部', icon: '📊' } : TYPE_CONFIG[type];
                  const count = type === 'all' ? counts.all : (counts[type] || 0);
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between hover:bg-muted transition-colors ${
                        typeFilter === type ? 'bg-muted font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      <span>{config.icon} {config.label}</span>
                      <span className="font-mono text-[10px]">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {data?.codebases && data.codebases.length > 0 && (
              <>
                <Separator />
                <div className="p-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">代码仓库 ({counts.codebases})</h3>
                  <div className="space-y-1">
                    {data.codebases.map((repo) => (
                      <div key={repo.id} className="text-xs">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-muted transition-colors">
                          <span>📦</span>
                          <span className="font-medium truncate">{repo.title}</span>
                        </div>
                        {repo.summary && (
                          <p className="px-2 py-1 text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{repo.summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {data?.diagrams && data.diagrams.length > 0 && (
              <>
                <Separator />
                <div className="p-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">可视化图表</h3>
                  <div className="space-y-1">
                    {data.diagrams.map((diagram) => (
                      <button
                        key={diagram.path}
                        onClick={() => setSelectedDiagram(diagram.path)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors ${
                          selectedDiagram === diagram.path ? 'bg-muted font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        📊 {diagram.title}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Top Bar */}
          <div className="flex-none flex items-center gap-2 px-3.5 border-b bg-background rounded-t-lg">
            {data && (
              <Badge variant="outline" className="text-xs">
                {data.status === 'passed' ? '✅ 已通过' : data.status === 'reviewing' ? '🔍 评审中' : data.status === 'rejected' ? '❌ 未通过' : '📝 草案'}
              </Badge>
            )}
            {openCount > 0 && (
              <span className="text-xs text-muted-foreground">还有 {openCount} 项待处理</span>
            )}
            <Button
              onClick={handlePass}
              disabled={!data || data?.status === 'passed' || openCount > 0 || saving}
              className="ml-auto h-7 px-3 rounded bg-success hover:bg-success text-white text-xs disabled:opacity-50"
            >
              通过
            </Button>
          </div>
          {err && (
            <div className="bg-destructive/10 text-destructive text-xs px-3.5 py-1.5 border-b border-destructive/20">{err}</div>
          )}

          {/* Content Area */}
          <ScrollArea className="flex-1 p-4">
            {!data ? (
              <p className="text-xs text-muted-foreground text-center py-6">加载中…</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {typeFilter === 'all' ? '无评审项' : `暂无${TYPE_CONFIG[typeFilter]?.label || typeFilter}类型项`}
              </p>
            ) : (
              <div>
                {(['conflict', 'gap', 'ambiguity', 'decomposition', 'question'] as const).map((type) => {
                  const items = grouped.get(type);
                  if (!items || items.length === 0) return null;
                  const config = TYPE_CONFIG[type];
                  return (
                    <div key={type} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{config.icon}</span>
                        <h3 className="text-sm font-semibold">{config.label}</h3>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">{items.length}</Badge>
                      </div>
                      {items.map(renderItemCard)}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel: Document / Diagram Viewer */}
        {(selectedDoc || selectedDiagram) && (
          <div className="w-[45%] flex-none border-l bg-background rounded-lg overflow-hidden flex flex-col">
            <div className="flex-none flex items-center justify-between px-3 py-2 border-b bg-background">
              <div className="flex items-center gap-2">
                {selectedDoc && <span className="text-xs font-mono font-medium">📄 {selectedDoc}</span>}
                {selectedDiagram && <span className="text-xs font-mono font-medium">📊 {selectedDiagram}</span>}
              </div>
              <div className="flex items-center gap-1">
                {selectedDoc && selectedDiagram && (
                  <button
                    onClick={() => setSelectedDiagram(null)}
                    className="text-xs px-2 py-0.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    看文档
                  </button>
                )}
                {selectedDiagram && selectedDoc && (
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="text-xs px-2 py-0.5 rounded hover:bg-muted text-muted-foreground"
                  >
                    看图表
                  </button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSelectedDoc(null); setSelectedDiagram(null); }}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              {selectedDoc && <DocViewer path={selectedDoc} />}
              {selectedDiagram && <DiagramViewer path={selectedDiagram} />}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Diagram Viewer ---
function DiagramViewer({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    let alive = true;
    setContent(null);
    setErr('');
    fetch('/__diagrams/' + encodeURIComponent(path), { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(t => {
        if (!alive) return;
        setContent(t);
        // Extract title from HTML
        const match = t.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (match) setTitle(match[1]);
      })
      .catch(e => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [path]);

  if (err) return <p className="text-xs text-destructive p-4">加载失败: {err}</p>;
  if (content === null) return <p className="text-xs text-muted-foreground p-4">加载中…</p>;

  return (
    <div className="h-full flex flex-col">
      {title && <h3 className="text-sm font-medium mb-3">{title}</h3>}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-white">
        <iframe
          srcDoc={content}
          title={title || path}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
        />
      </div>
    </div>
  );
}

// --- Document Viewer ---
function DocViewer({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setContent(null);
    setErr('');
    fetch('/__docs/' + encodeURIComponent(path), { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(t => { if (alive) setContent(t); })
      .catch(e => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [path]);

  if (err) return <p className="text-xs text-destructive p-4">加载失败: {err}</p>;
  if (content === null) return <p className="text-xs text-muted-foreground p-4">加载中…</p>;

  // Simple markdown-like rendering for preview
  const lines = content.split('\n');
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) return <h1 key={idx} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={idx} className="text-lg font-semibold mt-3 mb-1.5">{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={idx} className="text-base font-medium mt-2 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('- ')) return <li key={idx} className="ml-4 text-sm">{line.slice(2)}</li>;
        if (line.startsWith('---')) return <hr key={idx} className="my-3 border-border" />;
        if (line.trim() === '') return <br key={idx} />;
        return <p key={idx} className="text-sm leading-relaxed my-1">{line}</p>;
      })}
    </div>
  );
}

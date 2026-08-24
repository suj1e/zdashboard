import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export type ItemState = 'open' | 'answered' | 'accepted' | 'dismissed';
export type ReviewStatus = 'draft' | 'reviewing' | 'passed' | 'rejected';
export type ItemType = 'question' | 'conflict' | 'gap' | 'ambiguity' | 'decomposition';
export type Priority = 'high' | 'medium' | 'low';
export type Severity = 'high' | 'medium' | 'low';

export interface ReviewItem {
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

export interface ReviewDocument {
  id: string;
  path: string;
  title: string;
  type: string;
  parsedAt: string;
}

export interface ReviewCodebase {
  id: string;
  path: string;
  title: string;
  type: string;
  summary: string;
}

export interface ReviewDiagram {
  path: string;
  title: string;
  type: string;
}

export interface ReviewData {
  status: ReviewStatus;
  summary: string;
  documents: ReviewDocument[];
  codebases: ReviewCodebase[];
  diagrams: ReviewDiagram[];
  items: ReviewItem[];
}

const REVIEW_DIR = '.zreview';
const REVIEW_FILE = path.join(REVIEW_DIR, 'review.yaml');
const DOCS_DIR = path.join(REVIEW_DIR, 'docs');
const DIAGRAMS_DIR = path.join(REVIEW_DIR, 'diagrams');

export class ReviewStore {
  private root: string;
  private onChange?: () => void;

  constructor(root: string, onChange?: () => void) {
    this.root = root;
    this.onChange = onChange;
  }

  exists(): boolean { return fs.existsSync(path.join(this.root, REVIEW_FILE)); }

  read(): ReviewData {
    const fullPath = path.join(this.root, REVIEW_FILE);
    if (!fs.existsSync(fullPath)) {
      return { status: 'draft', summary: '', documents: [], codebases: [], diagrams: [], items: [] };
    }
    try {
      const parsed = YAML.parse(fs.readFileSync(fullPath, 'utf8')) as ReviewData;
      if (!parsed || !Array.isArray(parsed.items)) {
        return { status: 'draft', summary: parsed?.summary ?? '', documents: parsed?.documents ?? [], codebases: parsed?.codebases ?? [], diagrams: parsed?.diagrams ?? [], items: [] };
      }
      return {
        status: parsed.status ?? 'draft',
        summary: parsed.summary ?? '',
        documents: parsed.documents ?? [],
        codebases: parsed.codebases ?? [],
        diagrams: parsed.diagrams ?? [],
        items: parsed.items,
      };
    } catch {
      return { status: 'draft', summary: '', documents: [], codebases: [], diagrams: [], items: [] };
    }
  }

  private write(data: ReviewData) {
    fs.mkdirSync(path.join(this.root, REVIEW_DIR), { recursive: true });
    fs.writeFileSync(path.join(this.root, REVIEW_FILE), YAML.stringify(data), 'utf8');
    this.onChange?.();
  }

  updateItem(id: string, patch: { answer?: string; state?: ItemState; priority?: Priority; title?: string }): ReviewData {
    const data = this.read();
    const item = this.findItem(data.items, id);
    if (!item) throw new Error(`item ${id} not found`);
    if (patch.answer !== undefined) item.answer = patch.answer;
    if (patch.state !== undefined) item.state = patch.state;
    if (patch.priority !== undefined) item.priority = patch.priority;
    if (patch.title !== undefined) item.title = patch.title;
    if (patch.state === 'answered' && !patch.answer && !item.answer) item.answer = '';
    this.write(data);
    return data;
  }

  addChild(parentId: string, title: string, priority: Priority = 'medium'): ReviewData {
    const data = this.read();
    const parent = this.findItem(data.items, parentId);
    if (!parent) throw new Error(`parent ${parentId} not found`);
    if (!parent.children) parent.children = [];
    const newId = `${parentId}-${parent.children.length + 1}`;
    parent.children.push({
      id: newId,
      type: 'decomposition',
      state: 'open',
      title,
      priority,
    });
    this.write(data);
    return data;
  }

  removeItem(id: string): ReviewData {
    const data = this.read();
    const removed = this.removeItemFromList(data.items, id);
    if (!removed) throw new Error(`item ${id} not found`);
    this.write(data);
    return data;
  }

  setStatus(status: ReviewStatus): ReviewData {
    const data = this.read();
    if (status === 'passed' && this.hasOpenItems(data.items)) {
      throw new Error('存在未处理的评审项(open),不能通过');
    }
    data.status = status;
    this.write(data);
    return data;
  }

  listDocs(): string[] {
    const docsDir = path.join(this.root, DOCS_DIR);
    if (!fs.existsSync(docsDir)) return [];
    try {
      return fs.readdirSync(docsDir)
        .filter((f) => /\.(md|markdown|txt)$/i.test(f))
        .sort();
    } catch { return []; }
  }

  readDoc(name: string): string {
    const fullPath = path.join(this.root, DOCS_DIR, name);
    if (!fs.existsSync(fullPath)) throw new Error(`doc ${name} not found`);
    return fs.readFileSync(fullPath, 'utf8');
  }

  listDiagrams(): string[] {
    const dir = path.join(this.root, DIAGRAMS_DIR);
    if (!fs.existsSync(dir)) return [];
    try {
      return fs.readdirSync(dir)
        .filter((f) => /\.html$/i.test(f))
        .sort();
    } catch { return []; }
  }

  readDiagram(name: string): string {
    const fullPath = path.join(this.root, DIAGRAMS_DIR, name);
    if (!fs.existsSync(fullPath)) throw new Error(`diagram ${name} not found`);
    return fs.readFileSync(fullPath, 'utf8');
  }

  private findItem(items: ReviewItem[], id: string): ReviewItem | null {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this.findItem(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  private removeItemFromList(items: ReviewItem[], id: string): boolean {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        items.splice(i, 1);
        return true;
      }
      if (items[i].children && this.removeItemFromList(items[i].children!, id)) {
        return true;
      }
    }
    return false;
  }

  private hasOpenItems(items: ReviewItem[]): boolean {
    for (const item of items) {
      if (item.state === 'open') return true;
      if (item.children && this.hasOpenItems(item.children)) return true;
    }
    return false;
  }
}

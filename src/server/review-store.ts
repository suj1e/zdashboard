import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export type ItemState = 'open' | 'answered' | 'accepted' | 'dismissed';
export type ReviewStatus = 'draft' | 'reviewing' | 'passed' | 'rejected';

export interface ReviewItem {
  id: string;
  doc?: string;
  category?: string;
  severity?: 'high' | 'medium' | 'low';
  state: ItemState;
  question: string;
  answer?: string;
}

export interface ReviewData {
  status: ReviewStatus;
  items: ReviewItem[];
}

const REVIEW_FILE = 'review.yaml';

export class ReviewStore {
  private root: string;
  private file: string;
  private onChange?: () => void;

  constructor(root: string, onChange?: () => void) {
    this.root = root;
    this.file = path.join(root, REVIEW_FILE);
    this.onChange = onChange;
  }

  exists(): boolean { return fs.existsSync(this.file); }

  read(): ReviewData {
    try {
      const parsed = YAML.parse(fs.readFileSync(this.file, 'utf8')) as ReviewData;
      if (!parsed || !Array.isArray(parsed.items)) return { status: 'draft', items: [] };
      return parsed;
    } catch {
      return { status: 'draft', items: [] };
    }
  }

  private write(data: ReviewData) {
    fs.writeFileSync(this.file, YAML.stringify(data), 'utf8');
    this.onChange?.();
  }

  updateItem(id: string, patch: { answer?: string; state?: ItemState }): ReviewData {
    const data = this.read();
    const item = data.items.find((i) => i.id === id);
    if (!item) throw new Error(`item ${id} not found`);
    if (patch.answer !== undefined) item.answer = patch.answer;
    if (patch.state !== undefined) item.state = patch.state;
    if (patch.state === 'answered' && !patch.answer && !item.answer) item.answer = '';
    this.write(data);
    return data;
  }

  setStatus(status: ReviewStatus): ReviewData {
    const data = this.read();
    if (status === 'passed' && data.items.some((i) => i.state === 'open')) {
      throw new Error('存在未处理的评审项(open),不能通过');
    }
    data.status = status;
    this.write(data);
    return data;
  }

  docs(): string[] {
    try {
      return fs.readdirSync(this.root)
        .filter((f) => /\.(md|markdown)$/i.test(f) && fs.statSync(path.join(this.root, f)).isFile())
        .sort();
    } catch { return []; }
  }
}

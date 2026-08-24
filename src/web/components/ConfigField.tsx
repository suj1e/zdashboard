import { useState } from 'react';
import type { PluginConfigSchema } from '../hooks/usePluginConfig.js';

interface ConfigFieldProps {
  key_: string;
  field: PluginConfigSchema[string];
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

export function ConfigField({ key_, field, value, onChange }: ConfigFieldProps) {
  const { type, label, placeholder, options } = field;

  if (type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(key_, e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border"
        />
        <span className="text-foreground">{label}</span>
      </label>
    );
  }

  if (type === 'text') {
    return (
      <div className="text-xs">
        <label className="block text-muted-foreground mb-1">{label}</label>
        <textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(key_, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-2 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
        />
      </div>
    );
  }

  if (type === 'string[]') {
    const items = Array.isArray(value) ? value : [];
    const [draft, setDraft] = useState('');
    const add = () => {
      const v = draft.trim();
      if (!v) return;
      onChange(key_, [...items, v]);
      setDraft('');
    };
    return (
      <div className="text-xs">
        <label className="block text-muted-foreground mb-1">{label}</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
              {it}
              <button onClick={() => onChange(key_, items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
            placeholder={placeholder}
            className="flex-1 h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
          />
          <button onClick={add} className="h-7 px-2 text-xs rounded border border-border hover:bg-muted">+</button>
        </div>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="text-xs">
        <label className="block text-muted-foreground mb-1">{label}</label>
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(key_, e.target.value)}
          className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
        >
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (v: string) => {
      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
      onChange(key_, next);
    };
    return (
      <div className="text-xs">
        <label className="block text-muted-foreground mb-1">{label}</label>
        <div className="flex flex-wrap gap-1">
          {(options ?? []).map((o) => (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`px-2 py-1 rounded border ${selected.includes(o.value) ? 'bg-primary/10 border-primary text-foreground' : 'border-border text-muted-foreground'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // string, number, fallback
  return (
    <div className="text-xs">
      <label className="block text-muted-foreground mb-1">{label}</label>
      <input
        type={type === 'number' ? 'number' : 'text'}
        value={String(value ?? '')}
        onChange={(e) => onChange(key_, type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="w-full h-7 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
      />
    </div>
  );
}

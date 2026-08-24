import { useState, useEffect, useCallback } from 'react';

export interface PluginConfigSchema {
  [key: string]: {
    type: 'string' | 'text' | 'number' | 'boolean' | 'string[]' | 'select' | 'multiselect';
    label: string;
    default?: unknown;
    placeholder?: string;
    options?: { value: string; label: string }[];
  };
}

export function usePluginConfig(mode: string, schema?: PluginConfigSchema) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/__plugins/config', { cache: 'no-store' });
      const all = await res.json();
      const pluginConf = all[mode] ?? {};
      const merged: Record<string, unknown> = {};
      if (schema) {
        for (const [key, field] of Object.entries(schema)) {
          merged[key] = key in pluginConf ? pluginConf[key] : (field.default ?? '');
        }
      }
      setConfig(merged);
    } catch {
      setConfig({});
    } finally {
      setLoading(false);
    }
  }, [mode, schema]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const save = useCallback(async (next: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/__plugins/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Stop-Token': document.querySelector('meta[name="stop-token"]')?.getAttribute('content') ?? '' },
        body: JSON.stringify({ [mode]: next }),
      });
      if (res.ok) {
        setConfig(next);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [mode]);

  return { config, setConfig, save, loading, saving, refresh: fetchConfig };
}

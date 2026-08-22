export interface StyleDef {
  id: string;
  label: string;
  swatch: string[]; // 4-color preview
}

export const STYLES: StyleDef[] = [
  { id: 'default', label: 'Default', swatch: ['#ffffff', '#f4f4f5', '#4f46e5', '#18181b'] },
  { id: 'pixel',   label: 'Pixel',   swatch: ['#1a1c2c', '#29366f', '#ef7d57', '#38b764'] },
  { id: 'slate',   label: 'Slate',   swatch: ['#f8fafc', '#e2e8f0', '#3b82f6', '#0f172a'] },
];

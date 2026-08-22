export interface StyleDef {
  id: 'default' | 'pixel';
  label: string;
  swatch: string[]; // 4-color preview
}

export const STYLES: StyleDef[] = [
  { id: 'default', label: 'Default', swatch: ['#ffffff', '#f4f4f5', '#4f46e5', '#18181b'] },
  { id: 'pixel',   label: 'Pixel',   swatch: ['#1a1c2c', '#29366f', '#ef7d57', '#38b764'] },
];

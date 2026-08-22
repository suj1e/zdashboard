export interface StyleDef {
  id: string;
  label: string;
  swatch: string[]; // 4-color preview
}

export const STYLES: StyleDef[] = [
  { id: 'default', label: 'Default', swatch: ['#ffffff', '#f4f4f5', '#4f46e5', '#18181b'] },
  { id: 'pixel',   label: 'Pixel',   swatch: ['#1a1c2c', '#29366f', '#ef7d57', '#38b764'] },
  { id: 'nord',    label: 'Nord',    swatch: ['#2e3440', '#5e81ac', '#a3be8c', '#d8dee9'] },
];

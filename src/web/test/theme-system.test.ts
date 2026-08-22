import { describe, it, expect } from 'vitest';
import { STYLES } from '../lib/themes';

describe('theme system v2', () => {
  it('themes.ts has default, pixel, nord entries', () => {
    const ids = STYLES.map(s => s.id);
    expect(ids).toContain('default');
    expect(ids).toContain('pixel');
    expect(ids).toContain('nord');
  });

  it('StyleDef id is string (not union)', () => {
    const id: string = STYLES[0].id;
    expect(typeof id).toBe('string');
  });

  it('nord swatch has 4 colors', () => {
    const nord = STYLES.find(s => s.id === 'nord');
    expect(nord).toBeDefined();
    expect(nord!.swatch).toHaveLength(4);
  });
});

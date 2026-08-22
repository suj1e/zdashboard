import { describe, it, expect } from 'vitest';
import { STYLES } from '../lib/themes';

describe('theme system v2', () => {
  it('themes.ts has default, pixel, slate entries', () => {
    const ids = STYLES.map(s => s.id);
    expect(ids).toContain('default');
    expect(ids).toContain('pixel');
    expect(ids).toContain('slate');
  });

  it('StyleDef id is string (not union)', () => {
    const id: string = STYLES[0].id;
    expect(typeof id).toBe('string');
  });

  it('slate swatch has 4 colors', () => {
    const slate = STYLES.find(s => s.id === 'slate');
    expect(slate).toBeDefined();
    expect(slate!.swatch).toHaveLength(4);
  });
});

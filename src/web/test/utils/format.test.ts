import { describe, it, expect } from 'vitest';
import { formatDate, formatBytes, formatStatus } from '../../lib/utils';

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('01');
    expect(result).toContain('15');
  });

  it('handles invalid date', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('handles Date object', () => {
    const result = formatDate(new Date('2024-06-01T00:00:00Z'));
    expect(result).toContain('2024');
    expect(result).toContain('06');
    expect(result).toContain('01');
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 kB');
    expect(formatBytes(1536)).toBe('1.5 kB');
  });

  it('handles invalid input', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });
});

describe('formatStatus', () => {
  it('maps known statuses', () => {
    expect(formatStatus('active')).toBe('active');
    expect(formatStatus('resolved')).toBe('resolved');
  });

  it('returns original for unknown', () => {
    expect(formatStatus('unknown')).toBe('unknown');
  });
});

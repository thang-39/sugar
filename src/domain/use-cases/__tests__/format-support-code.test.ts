import { formatSupportCode } from '../format-support-code';

describe('formatSupportCode', () => {
  it('formats a UUID into SGR-XXXX-XXXX using the first 8 alphanumerics, uppercased', () => {
    expect(formatSupportCode('8f3a1c2d-abcd-4ef0-9012-3456789abcde')).toBe('SGR-8F3A-1C2D');
  });

  it('drops non-alphanumeric separators before slicing', () => {
    expect(formatSupportCode('ab-cd-ef-gh-ij')).toBe('SGR-ABCD-EFGH');
  });

  it('pads short ids so the shape is always stable', () => {
    expect(formatSupportCode('a1')).toBe('SGR-A100-0000');
    expect(formatSupportCode('')).toBe('SGR-0000-0000');
  });

  it('is deterministic — same id always yields the same code', () => {
    const id = '3456789abcde-0000';
    expect(formatSupportCode(id)).toBe(formatSupportCode(id));
  });
});

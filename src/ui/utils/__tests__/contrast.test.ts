import { contrastRatio, relativeLuminance } from '@/ui/utils/contrast';

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('is 1 for a color against itself', () => {
    expect(contrastRatio('#0FA36B', '#0FA36B')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#1B2B24', '#F7FBF8')).toBeCloseTo(
      contrastRatio('#F7FBF8', '#1B2B24'),
      5,
    );
  });

  it('accepts 3-digit hex', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 1);
  });
});

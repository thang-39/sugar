import { mgdlToMmol, mmolToMgdl } from '@/domain/use-cases/convert-unit';

describe('convert-unit', () => {
  describe('mgdlToMmol (display, 1 decimal)', () => {
    it.each([
      [20, 1.1],
      [126, 7],
      [180, 10],
      [200, 11.1],
      [600, 33.3],
    ])('converts %i mg/dL to %f mmol/L', (mgdl, mmol) => {
      expect(mgdlToMmol(mgdl)).toBe(mmol);
    });
  });

  describe('mmolToMgdl (input → nearest integer mg/dL)', () => {
    it.each([
      [1.1, 20],
      [5.6, 101],
      [7, 126],
      [10, 180],
      [33.3, 600],
    ])('converts %f mmol/L to %i mg/dL', (mmol, mgdl) => {
      expect(mmolToMgdl(mmol)).toBe(mgdl);
    });
  });

  describe('round-trip: typed mmol/L redisplays unchanged', () => {
    it.each([[1.1], [5.6], [7], [8.3], [10], [15], [20], [33.3]])(
      '%f mmol/L survives storage round-trip',
      (typed) => {
        expect(mgdlToMmol(mmolToMgdl(typed))).toBe(typed);
      },
    );
  });
});

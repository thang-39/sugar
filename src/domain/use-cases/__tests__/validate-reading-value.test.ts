import { validateReadingValue } from '@/domain/use-cases/validate-reading-value';
import { Unit } from '@/domain/models/unit';

describe('validateReadingValue', () => {
  describe('mg/dL', () => {
    it('accepts 20 as within normal range', () => {
      expect(validateReadingValue('20', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 20,
        withinNormalRange: true,
      });
    });

    it('accepts 600 as within normal range', () => {
      expect(validateReadingValue('600', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 600,
        withinNormalRange: true,
      });
    });

    it('accepts 19 but flags out-of-range (warn-only)', () => {
      expect(validateReadingValue('19', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 19,
        withinNormalRange: false,
      });
    });

    it('accepts 601 but flags out-of-range (warn-only)', () => {
      expect(validateReadingValue('601', Unit.MgDl)).toEqual({
        ok: true,
        mgdl: 601,
        withinNormalRange: false,
      });
    });

    it('rejects decimals in mg/dL', () => {
      expect(validateReadingValue('100.5', Unit.MgDl)).toEqual({
        ok: false,
        reason: 'not-integer',
      });
    });

    it('rejects empty and non-numeric', () => {
      expect(validateReadingValue('', Unit.MgDl)).toEqual({ ok: false, reason: 'empty' });
      expect(validateReadingValue('abc', Unit.MgDl)).toEqual({
        ok: false,
        reason: 'not-a-number',
      });
    });
  });

  describe('mmol/L', () => {
    it('accepts comma decimal separator', () => {
      expect(validateReadingValue('5,6', Unit.MmolL)).toEqual({
        ok: true,
        mgdl: 101,
        withinNormalRange: true,
      });
    });

    it('accepts dot decimal separator', () => {
      expect(validateReadingValue('5.6', Unit.MmolL)).toEqual({
        ok: true,
        mgdl: 101,
        withinNormalRange: true,
      });
    });

    it('rejects more than one decimal place', () => {
      expect(validateReadingValue('5.65', Unit.MmolL)).toEqual({
        ok: false,
        reason: 'too-precise',
      });
    });

    it('flags a low mmol value as out-of-range (warn-only)', () => {
      // 1.0 mmol/L -> 18 mg/dL (< 20)
      expect(validateReadingValue('1.0', Unit.MmolL)).toEqual({
        ok: true,
        mgdl: 18,
        withinNormalRange: false,
      });
    });
  });
});

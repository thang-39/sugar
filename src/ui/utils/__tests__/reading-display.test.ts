import { RangeEvaluation } from '@/domain/models/target-range';
import { colors } from '@/ui/theme';
import { contrastRatio } from '@/ui/utils/contrast';
import { statusBadge, statusColor } from '@/ui/utils/reading-display';

const AA_NORMAL = 4.5;

describe('statusColor contrast on white card', () => {
  const cases = [RangeEvaluation.InRange, RangeEvaluation.Low, RangeEvaluation.High];
  it.each(cases)('%s status text meets AA on card', (evaluation) => {
    expect(contrastRatio(statusColor(evaluation), colors.card)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

describe('statusBadge text-on-tint contrast', () => {
  const cases = [RangeEvaluation.InRange, RangeEvaluation.Low, RangeEvaluation.High];
  it.each(cases)('%s badge text meets AA on its tint', (evaluation) => {
    const { color, backgroundColor } = statusBadge(evaluation);
    expect(contrastRatio(color, backgroundColor)).toBeGreaterThanOrEqual(AA_NORMAL);
  });
});

import { RangeEvaluation } from '@/domain/models/target-range';
import { colors } from '@/ui/theme';

/** Foreground/accent color for a target-range evaluation (badges, dots, text). */
export function statusColor(evaluation: RangeEvaluation): string {
  switch (evaluation) {
    case RangeEvaluation.Low:
      return colors.low;
    case RangeEvaluation.High:
      return colors.high;
    default:
      return colors.inRange;
  }
}

/** Soft background tint matching {@link statusColor}. */
export function statusBgColor(evaluation: RangeEvaluation): string {
  switch (evaluation) {
    case RangeEvaluation.Low:
      return colors.lowBg;
    case RangeEvaluation.High:
      return colors.highBg;
    default:
      return colors.inRangeBg;
  }
}

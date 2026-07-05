import { RangeEvaluation } from '@/domain/models/target-range';
import { colors } from '@/ui/theme';

/** Contrast-safe foreground/text color for a target-range evaluation. */
export function statusColor(evaluation: RangeEvaluation): string {
  switch (evaluation) {
    case RangeEvaluation.Low:
      return colors.lowText;
    case RangeEvaluation.High:
      return colors.highText;
    default:
      return colors.inRangeText;
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

/** Badge foreground + background pair for a status pill (contrast-safe). */
export function statusBadge(evaluation: RangeEvaluation): {
  color: string;
  backgroundColor: string;
} {
  return { color: statusColor(evaluation), backgroundColor: statusBgColor(evaluation) };
}

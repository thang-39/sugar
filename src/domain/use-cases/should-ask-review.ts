/** Inputs deciding whether to surface the in-app store-review prompt. */
export interface ReviewGateInput {
  /** Unix ms the review was last requested, or null if never asked. */
  reviewAskedAt: number | null;
  /** Number of successful PDF report exports so far. */
  reportCount: number;
  /** Total readings logged so far. */
  readingCount: number;
}

/** Fallback trigger when the user never exports a report. */
const READING_FALLBACK = 20;

/**
 * Ask for a store review exactly once, at the first high-satisfaction moment:
 * right after the first successful report export, or — as a fallback for users who
 * never export — once they have logged {@link READING_FALLBACK} readings.
 * Once asked (`reviewAskedAt` set), never ask again.
 */
export function shouldAskForReview({ reviewAskedAt, reportCount, readingCount }: ReviewGateInput): boolean {
  if (reviewAskedAt != null) return false;
  return reportCount >= 1 || readingCount >= READING_FALLBACK;
}

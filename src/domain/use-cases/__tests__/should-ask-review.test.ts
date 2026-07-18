import { shouldAskForReview } from '@/domain/use-cases/should-ask-review';

describe('shouldAskForReview', () => {
  it('asks after the first successful report export', () => {
    expect(shouldAskForReview({ reviewAskedAt: null, reportCount: 1, readingCount: 0 })).toBe(true);
  });

  it('asks once the fallback of 20 readings is reached even with no report', () => {
    expect(shouldAskForReview({ reviewAskedAt: null, reportCount: 0, readingCount: 20 })).toBe(true);
  });

  it('does not ask before either threshold is met', () => {
    expect(shouldAskForReview({ reviewAskedAt: null, reportCount: 0, readingCount: 19 })).toBe(false);
  });

  it('never asks again once it has already been asked', () => {
    expect(shouldAskForReview({ reviewAskedAt: 1_700_000_000_000, reportCount: 5, readingCount: 40 })).toBe(
      false,
    );
  });
});

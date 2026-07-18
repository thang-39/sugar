import {
  resolveLifecyclePhase,
  shouldShowBirthPrompt,
} from '@/domain/use-cases/lifecycle';

const DAY = 86_400_000;

describe('resolveLifecyclePhase', () => {
  it('is general when not gestational', () => {
    expect(resolveLifecyclePhase({ conditionType: 'general', babyBornAt: null })).toBe('general');
  });
  it('is pregnant when gestational and not born', () => {
    expect(resolveLifecyclePhase({ conditionType: 'gestational', babyBornAt: null })).toBe(
      'pregnant',
    );
  });
  it('is postpartum once babyBornAt is set', () => {
    expect(resolveLifecyclePhase({ conditionType: 'gestational', babyBornAt: 1 })).toBe(
      'postpartum',
    );
  });
});

describe('shouldShowBirthPrompt', () => {
  const due = new Date(2026, 5, 1).getTime();
  const base = { conditionType: 'gestational' as const, babyBornAt: null, dueDate: due };

  it('shows when past due, not born, not snoozed', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: null, now: due + DAY })).toBe(true);
  });
  it('is hidden before the due date', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: null, now: due - DAY })).toBe(false);
  });
  it('is hidden while snoozed under 7 days', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: due, now: due + 3 * DAY })).toBe(false);
  });
  it('reappears once the 7-day snooze elapses', () => {
    expect(shouldShowBirthPrompt({ ...base, snoozedAt: due, now: due + 8 * DAY })).toBe(true);
  });
  it('is hidden once the baby is born', () => {
    expect(
      shouldShowBirthPrompt({ ...base, babyBornAt: due, snoozedAt: null, now: due + DAY }),
    ).toBe(false);
  });
  it('is hidden for a general user', () => {
    expect(
      shouldShowBirthPrompt({
        conditionType: 'general',
        babyBornAt: null,
        dueDate: due,
        snoozedAt: null,
        now: due + DAY,
      }),
    ).toBe(false);
  });
});

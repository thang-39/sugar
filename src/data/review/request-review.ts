import * as StoreReview from 'expo-store-review';

import { shouldAskForReview, type ReviewGateInput } from '@/domain/use-cases/should-ask-review';

/**
 * Fire the OS store-review prompt at most once, at the first high-satisfaction
 * moment (see {@link shouldAskForReview}). The caller supplies the current gate
 * inputs and a `markAsked` callback that persists the one-shot `reviewAskedAt`
 * flag; marking happens before the (OS-rate-limited) request so a single call
 * burns the one shot even if the OS chooses not to display anything.
 *
 * `expo-store-review` is a no-op in Expo Go, so this is safe to call in dev.
 * Returns true when a prompt was requested.
 */
export async function maybeRequestReview(
  input: ReviewGateInput,
  markAsked: () => void | Promise<void>,
): Promise<boolean> {
  if (!shouldAskForReview(input)) return false;
  await markAsked();
  if (await StoreReview.isAvailableAsync()) {
    await StoreReview.requestReview();
  }
  return true;
}

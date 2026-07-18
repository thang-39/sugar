import { Linking } from 'react-native';

import { FEEDBACK_FORM_URL } from '@/config/feedback';

/** Open the external feedback form. Throws if the link can't be opened — callers alert. */
export async function openFeedbackForm(): Promise<void> {
  await Linking.openURL(FEEDBACK_FORM_URL);
}

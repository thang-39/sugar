import type { ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LogReadingForm } from '@/ui/components/log-reading-form';
import { ScreenHeader } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, spacing } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

export default function LogScreen(): ReactElement {
  const { t } = useTranslation();
  const preferredLanguage = useSettingsStore((s) => s.preferredLanguage);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <ScreenHeader
              title={t('screens.log.title')}
              subtitle={formatDate(new Date(), preferredLanguage)}
            />
          </View>
          <LogReadingForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});

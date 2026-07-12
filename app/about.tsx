import Constants from 'expo-constants';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card } from '@/ui/components/ui';
import { colors, spacing } from '@/ui/theme';

// Hosted via GitHub Pages (see docs/privacy.html + the Session 14 launch guide).
const PRIVACY_URL = 'https://thang-39.github.io/sugar/privacy.html';

export default function AboutScreen(): ReactElement {
  const { t } = useTranslation();
  const [isOpening, setIsOpening] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const openPrivacy = async (): Promise<void> => {
    try {
      setIsOpening(true);
      await Linking.openURL(PRIVACY_URL);
    } catch {
      Alert.alert(t('common.errorTitle'));
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppText variant="title">{t('app.name')}</AppText>
        <AppText color={colors.textMuted}>
          {t('screens.settings.about.version', { version })}
        </AppText>
      </View>

      <Card>
        <AppText style={styles.disclaimer}>{t('common.disclaimer')}</AppText>
      </Card>

      <Button
        variant="ghost"
        label={t('screens.settings.about.privacyPolicy')}
        icon="shield-checkmark-outline"
        onPress={() => void openPrivacy()}
        isLoading={isOpening}
        accessibilityRole="link"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  disclaimer: {
    lineHeight: 24,
    textAlign: 'center',
  },
});

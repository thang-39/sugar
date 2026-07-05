import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { AppText, Button, IconTile, SectionLabel, SegmentedControl } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, radius, spacing } from '@/ui/theme';

interface Feature {
  key: 'log' | 'trends' | 'export' | 'offline';
  color: string;
  fg: string;
}

// Feature grid mirrors the design (design/Sugar App.dc.html onboarding block):
// blue / purple / amber / orange accent tiles. Amber uses ink text for contrast.
const FEATURES: readonly Feature[] = [
  { key: 'log', color: colors.accentBlue, fg: colors.onPrimary },
  { key: 'trends', color: colors.accentPurple, fg: colors.onPrimary },
  { key: 'export', color: colors.accentAmber, fg: colors.text },
  { key: 'offline', color: colors.accentOrange, fg: colors.onPrimary },
];

export default function OnboardingScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { preferredUnit, preferredLanguage, updateSetting } = useSettingsStore();

  // Pickers persist live (updateSetting also switches i18n for language), so the
  // screen previews the user's choices immediately. Get Started only flips the flag.
  const finish = async (): Promise<void> => {
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };

  // Skip → force the documented defaults (vi + mg/dL), then leave.
  const skip = async (): Promise<void> => {
    await updateSetting('preferredLanguage', Language.Vietnamese);
    await updateSetting('preferredUnit', Unit.MgDl);
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.skipRow}>
          <Button
            variant="ghost"
            label={t('screens.onboarding.skip')}
            onPress={() => void skip()}
            style={styles.skipBtn}
          />
        </View>

        <View style={styles.hero}>
          <IconTile icon="water" color={colors.primary} size={64} />
          <AppText variant="title">{t('app.name')}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {t('app.tagline')}
          </AppText>
        </View>

        <View style={styles.grid}>
          {FEATURES.map((f) => (
            <View key={f.key} style={[styles.featureCard, { backgroundColor: f.color }]}>
              <AppText weight="extrabold" color={f.fg}>
                {t(`screens.onboarding.features.${f.key}.title`)}
              </AppText>
              <AppText variant="caption" color={f.fg} style={styles.featureSub}>
                {t(`screens.onboarding.features.${f.key}.subtitle`)}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.pickerGroup}>
          <SectionLabel>{t('screens.onboarding.languageLabel')}</SectionLabel>
          <SegmentedControl
            segments={[
              { value: Language.Vietnamese, label: t('screens.onboarding.languages.vi') },
              { value: Language.English, label: t('screens.onboarding.languages.en') },
            ]}
            value={preferredLanguage}
            onChange={(v) => void updateSetting('preferredLanguage', v)}
          />
        </View>

        <View style={styles.pickerGroup}>
          <SectionLabel>{t('screens.onboarding.unitLabel')}</SectionLabel>
          <SegmentedControl
            segments={[
              { value: Unit.MgDl, label: Unit.MgDl },
              { value: Unit.MmolL, label: Unit.MmolL },
            ]}
            value={preferredUnit}
            onChange={(v) => void updateSetting('preferredUnit', v)}
          />
        </View>

        <AppText variant="caption" color={colors.textFaint} style={styles.disclaimer}>
          {t('common.disclaimer')}
        </AppText>

        <Button
          variant="primary"
          uppercase
          label={t('screens.onboarding.getStarted')}
          onPress={() => void finish()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  skipRow: {
    alignItems: 'flex-end',
  },
  skipBtn: {
    alignSelf: 'flex-end',
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  featureSub: {
    opacity: 0.85,
  },
  pickerGroup: {
    gap: spacing.sm,
  },
  disclaimer: {
    textAlign: 'center',
    lineHeight: 20,
  },
});

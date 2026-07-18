import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { getReadingRepository, getSettingsRepository } from '@/data/repositories/factory';
import { ConditionType } from '@/domain/models/condition';
import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { clearAllData } from '@/domain/use-cases/clear-all-data';
import { ProPromoCard } from '@/ui/components/pro-promo-card';
import { SettingRow } from '@/ui/components/setting-row';
import {
  AppText,
  Button,
  Card,
  SectionLabel,
  SegmentedControl,
  Toggle,
} from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { useEntitlementStore, useIsPro } from '@/ui/hooks/use-entitlement';
import { spacing, useTheme } from '@/ui/theme';
import { formatDate, formatValue } from '@/ui/utils/format';
import { haptics } from '@/ui/utils/haptics';

export default function SettingsScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const {
    preferredUnit,
    preferredLanguage,
    alertsEnabled,
    fastingRange,
    postMealRange,
    conditionType,
    analyticsEnabled,
    lastLocalBackupAt,
    updateSetting,
    resetToDefaults,
  } = useSettingsStore();
  const isPro = useIsPro();
  const setDevPro = useEntitlementStore((s) => s.setDevPro);
  const [isDeleting, setIsDeleting] = useState(false);

  const openPaywall = (): void =>
    router.push({ pathname: '/paywall', params: { paywallSource: 'settings' } });

  const modeLabel =
    conditionType === ConditionType.Gestational
      ? t('screens.settings.index.trackingModeValues.gestational')
      : t('screens.settings.index.trackingModeValues.general');

  const rangeSummary = `${formatValue(fastingRange.low, preferredUnit)}–${formatValue(
    fastingRange.high,
    preferredUnit,
  )} · ${formatValue(postMealRange.low, preferredUnit)}–${formatValue(
    postMealRange.high,
    preferredUnit,
  )}`;

  const performDelete = async (): Promise<void> => {
    void haptics.warning();
    try {
      setIsDeleting(true);
      await clearAllData({
        readingRepo: getReadingRepository(),
        settingsRepo: getSettingsRepository(),
      });
      // Fresh-install experience: resetToDefaults sets onboardingDone back to
      // false, so the tabs layout's first-run gate redirects to onboarding.
      resetToDefaults();
    } catch {
      void haptics.error();
      Alert.alert(t('common.errorTitle'), t('screens.settings.deleteAll.failed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (): void => {
    Alert.alert(
      t('screens.settings.deleteAll.step1Title'),
      t('screens.settings.deleteAll.step1Message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('screens.settings.deleteAll.continue'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('screens.settings.deleteAll.step2Title'),
              t('screens.settings.deleteAll.step2Message'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('screens.settings.deleteAll.confirm'),
                  style: 'destructive',
                  onPress: () => void performDelete(),
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {!isPro && <ProPromoCard onPress={openPaywall} />}

      <SectionLabel style={styles.sectionLabel}>
        {t('screens.settings.index.sections.preferences')}
      </SectionLabel>
      <Card style={styles.group}>
        <SettingRow
          icon="options"
          iconColor={colors.accentPurple}
          label={t('screens.settings.index.rows.trackingMode')}
          value={modeLabel}
          onPress={() => router.push('/tracking-mode')}
        />
        <SettingRow
          icon="alarm"
          iconColor={colors.accentOrange}
          label={t('screens.settings.index.rows.reminders')}
          onPress={() => router.push('/reminders')}
        />
        <SettingRow
          icon="resize"
          iconColor={colors.primary}
          label={t('screens.settings.index.rows.unit')}
          trailing={
            <SegmentedControl
              segments={[
                { value: Unit.MgDl, label: Unit.MgDl },
                { value: Unit.MmolL, label: Unit.MmolL },
              ]}
              value={preferredUnit}
              onChange={(v) => void updateSetting('preferredUnit', v)}
              style={styles.segment}
            />
          }
        />
        <SettingRow
          icon="language"
          iconColor={colors.accentBlue}
          label={t('screens.settings.index.rows.language')}
          trailing={
            <SegmentedControl
              segments={[
                {
                  value: Language.Vietnamese,
                  label: t('screens.settings.index.languageShort.vi'),
                },
                { value: Language.English, label: t('screens.settings.index.languageShort.en') },
              ]}
              value={preferredLanguage}
              onChange={(v) => void updateSetting('preferredLanguage', v)}
              style={styles.segment}
            />
          }
        />
        <SettingRow
          icon="notifications"
          iconColor={colors.accentOrange}
          label={t('screens.settings.index.rows.alerts')}
          isLast
          trailing={
            <Toggle
              value={alertsEnabled}
              onValueChange={(v) => void updateSetting('alertsEnabled', v)}
              accessibilityLabel={t('screens.settings.index.rows.alerts')}
            />
          }
        />
      </Card>

      <SectionLabel style={styles.sectionLabel}>
        {t('screens.settings.index.sections.pro')}
      </SectionLabel>
      <Card style={styles.group}>
        {isPro && (
          <SettingRow
            icon="star"
            iconColor={colors.accentAmber}
            label={t('screens.settings.index.rows.pro')}
            value={t('screens.settings.index.proUnlocked')}
          />
        )}
        <SettingRow
          icon="bar-chart"
          iconColor={colors.accentBlue}
          label={t('screens.settings.index.rows.analytics')}
          isLast
          trailing={
            <Toggle
              value={analyticsEnabled}
              onValueChange={(v) => void updateSetting('analyticsEnabled', v)}
              accessibilityLabel={t('screens.settings.index.rows.analytics')}
            />
          }
        />
      </Card>

      {__DEV__ && (
        <Card style={styles.group}>
          <SettingRow
            icon="bug"
            iconColor={colors.accentPurple}
            label={t('screens.settings.index.rows.devPro')}
            isLast
            trailing={<Toggle value={isPro} onValueChange={setDevPro} accessibilityLabel="devPro" />}
          />
        </Card>
      )}

      <SectionLabel style={styles.sectionLabel}>
        {t('screens.settings.index.sections.data')}
      </SectionLabel>
      <Card style={styles.group}>
        <SettingRow
          icon="alert-circle"
          iconColor={colors.accentPurple}
          label={t('screens.settings.index.rows.targetRanges')}
          value={rangeSummary}
          onPress={() => router.push('/target-range')}
        />
        <SettingRow
          icon="document-text"
          iconColor={colors.accentBlue}
          label={t('screens.settings.index.rows.report')}
          onPress={() => router.push('/report')}
        />
        <SettingRow
          icon="cloud-upload"
          iconColor={colors.primary}
          label={t('screens.settings.index.rows.backup')}
          value={
            lastLocalBackupAt !== null
              ? formatDate(new Date(lastLocalBackupAt), preferredLanguage)
              : t('screens.settings.backup.neverBackedUp')
          }
          onPress={() => router.push('/backup')}
        />
        <SettingRow
          icon="information-circle"
          iconColor={colors.textFaint}
          label={t('screens.settings.index.rows.about')}
          isLast
          onPress={() => router.push('/about')}
        />
      </Card>

      <Button
        variant="dangerOutline"
        label={t('screens.settings.deleteAll.row')}
        icon="trash-outline"
        onPress={confirmDelete}
        isLoading={isDeleting}
        style={styles.deleteButton}
      />

      <View style={styles.footer}>
        <AppText variant="caption" color={colors.textFaint} style={styles.footerText}>
          {t('common.disclaimer')}
        </AppText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  group: {
    padding: 0,
    overflow: 'hidden',
  },
  segment: {
    minWidth: 180,
  },
  deleteButton: {
    marginTop: spacing.xl,
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    textAlign: 'center',
    lineHeight: 18,
  },
});

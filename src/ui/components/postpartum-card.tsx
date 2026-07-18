import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactElement } from 'react';

import { ConditionType } from '@/domain/models/condition';
import { rescheduleOgttReminders } from '@/data/notifications/ogtt-reminders';
import { AppText, Button, Card } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';

const WEEK_MS = 7 * 86_400_000;

/** Today card for the postpartum phase: OGTT screening → yearly check + graduate to general. */
export function PostpartumCard(): ReactElement | null {
  const { t } = useTranslation();
  const colors = useTheme();
  const { babyBornAt, ogttDoneAt, updateSetting, applyConditionPreset } = useSettingsStore();

  if (babyBornAt === null) return null;
  const isDone = ogttDoneAt !== null;
  const weeks = Math.max(0, Math.floor((Date.now() - babyBornAt) / WEEK_MS));

  const markDone = async (): Promise<void> => {
    await updateSetting('ogttDoneAt', Date.now());
    await rescheduleOgttReminders();
  };

  const continueLongTerm = (): void => {
    Alert.alert(
      t('today.postpartum.switchConfirmTitle'),
      t('today.postpartum.switchConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('today.postpartum.switchConfirm'),
          onPress: () => {
            void applyConditionPreset(ConditionType.General).then(() => rescheduleOgttReminders());
          },
        },
      ],
    );
  };

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'calendar-outline'}
            size={26}
            color={colors.primary}
          />
          <AppText variant="heading" weight="extrabold" style={styles.title}>
            {isDone ? t('today.postpartum.doneTitle') : t('today.postpartum.ogttTitle')}
          </AppText>
        </View>
        <AppText color={colors.textMuted}>
          {isDone ? t('today.postpartum.doneSubtitle') : t('today.postpartum.ogttSubtitle')}
        </AppText>
        {!isDone && (
          <>
            <AppText variant="caption" color={colors.textMuted}>
              {t('today.postpartum.weeksSinceBirth', { weeks })}
            </AppText>
            <Button
              label={t('today.postpartum.markDone')}
              onPress={() => void markDone()}
              style={styles.doneBtn}
            />
          </>
        )}
      </Card>
      <Button
        label={t('today.postpartum.continueLongTerm')}
        variant="ghost"
        onPress={continueLongTerm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  doneBtn: { marginTop: spacing.sm },
});

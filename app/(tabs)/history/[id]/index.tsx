import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { MealTiming } from '@/domain/models/meal';
import { getReadingRepository } from '@/data/repositories/factory';
import { cancelRemindersForReading } from '@/data/notifications/notification-service';
import { deleteReading } from '@/domain/use-cases/delete-reading';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { useReading } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, fontSize, fontFamily, spacing } from '@/ui/theme';
import { formatDateTime, formatValue } from '@/ui/utils/format';
import { statusBgColor, statusColor } from '@/ui/utils/reading-display';
import { AppText, Badge, Button, Card } from '@/ui/components/ui';

function DetailRow({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.detailRow}>
      <AppText color={colors.textMuted}>{label}</AppText>
      <AppText weight="bold" style={styles.detailValue}>
        {children}
      </AppText>
    </View>
  );
}

export default function ReadingDetailScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferredUnit, preferredLanguage, fastingRange, postMealRange, postMeal2hRange } =
    useSettingsStore();
  const { reading, isLoading } = useReading(id);

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (reading === undefined) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="help-circle-outline" size={48} color={colors.textDisabled} />
        <AppText variant="heading" color={colors.textMuted}>
          {t('readingDetail.notFound')}
        </AppText>
      </View>
    );
  }

  const evaluation = evaluateReading(reading, {
    fasting: fastingRange,
    postMeal: postMealRange,
    postMeal2h: postMeal2hRange ?? undefined,
  });
  const recordedAt = new Date(reading.recordedAt);

  const confirmDelete = (): void => {
    Alert.alert(t('readingDetail.deleteConfirmTitle'), t('readingDetail.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('readingDetail.delete'),
        style: 'destructive',
        onPress: () => {
          void (async (): Promise<void> => {
            try {
              await deleteReading(reading.id, { repository: getReadingRepository() });
              void cancelRemindersForReading(reading.id).catch(() => {});
              router.back();
            } catch (err) {
              console.error('Failed to delete reading:', err);
              Alert.alert(t('common.errorTitle'), t('readingDetail.deleteFailed'));
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Value hero with status tint */}
      <View style={[styles.hero, { backgroundColor: statusBgColor(evaluation) }]}>
        <AppText variant="display" color={statusColor(evaluation)}>
          {formatValue(reading.value, preferredUnit)}
        </AppText>
        <AppText weight="bold" color={colors.textMuted}>
          {preferredUnit}
        </AppText>
        <Badge
          label={t(`status.${evaluation}`).toUpperCase()}
          color={colors.onPrimary}
          backgroundColor={statusColor(evaluation)}
          style={styles.statusBadge}
        />
      </View>

      <Card style={styles.card}>
        <DetailRow label={t('readingDetail.mealLabel')}>
          {t(`logForm.mealTypes.${reading.mealType}`)}
        </DetailRow>
        <DetailRow label={t('readingDetail.timingLabel')}>
          {t(`logForm.mealTimings.${reading.mealTiming}`)}
        </DetailRow>
        {reading.mealTiming === MealTiming.After && reading.hoursAfterMeal !== undefined && (
          <DetailRow label={t('readingDetail.hoursAfterLabel')}>
            {t('history.hoursValue', { n: reading.hoursAfterMeal })}
          </DetailRow>
        )}
        <DetailRow label={t('readingDetail.recordedAtLabel')}>
          {formatDateTime(recordedAt, preferredLanguage)}
        </DetailRow>
      </Card>

      <Card style={styles.card}>
        <AppText color={colors.textMuted}>{t('readingDetail.notesLabel')}</AppText>
        <AppText
          style={styles.notes}
          color={reading.notes === undefined ? colors.textDisabled : colors.text}
        >
          {reading.notes ?? t('readingDetail.noNotes')}
        </AppText>
      </Card>

      <Button
        label={t('readingDetail.edit')}
        onPress={() => router.push({ pathname: '/history/[id]/edit', params: { id: reading.id } })}
        icon="create-outline"
        uppercase={false}
      />
      <Button
        label={t('readingDetail.delete')}
        onPress={confirmDelete}
        variant="dangerOutline"
        icon="trash-outline"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  hero: {
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  statusBadge: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  card: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  notes: {
    marginTop: spacing.xs,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },
});

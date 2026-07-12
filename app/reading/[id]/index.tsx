import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { MealTiming } from '@/domain/models/meal';
import { getReadingRepository } from '@/data/repositories/factory';
import { cancelRemindersForReading } from '@/data/notifications/notification-service';
import { deleteReading } from '@/domain/use-cases/delete-reading';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { useReading } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { fontSize, fontFamily, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { formatDate, formatTime, formatValue } from '@/ui/utils/format';
import { statusColor } from '@/ui/utils/reading-display';
import { AppText, Badge, Button, Card } from '@/ui/components/ui';

function DetailRow({ label, children }: { label: string; children: ReactNode }): ReactElement {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const timingText =
    reading.mealTiming === MealTiming.After
      ? t('readingDetail.timingValues.after', {
          n: reading.hoursAfterMeal !== undefined && reading.hoursAfterMeal >= 2 ? 2 : 1,
        })
      : t('readingDetail.timingValues.before');

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
      {/* One card: colored value hero + detail rows + inline notes */}
      <Card style={styles.detailCard}>
        <View style={[styles.hero, { backgroundColor: statusColor(evaluation, colors) }]}>
          <Badge
            label={t(`status.${evaluation}`).toUpperCase()}
            color={statusColor(evaluation, colors)}
            backgroundColor={colors.heroBadgeBg}
            style={styles.statusBadge}
          />
          <AppText variant="display" color={colors.onPrimary} style={styles.heroValue}>
            {formatValue(reading.value, preferredUnit)}{' '}
            <AppText weight="bold" color={colors.onPrimary}>
              {preferredUnit}
            </AppText>
          </AppText>
        </View>

        <View style={styles.rows}>
          <DetailRow label={t('readingDetail.dateLabel')}>
            {formatDate(recordedAt, preferredLanguage)}
          </DetailRow>
          <DetailRow label={t('readingDetail.timeLabel')}>
            {formatTime(recordedAt, preferredLanguage)}
          </DetailRow>
          <DetailRow label={t('readingDetail.mealLabel')}>
            {t(`logForm.mealTypes.${reading.mealType}`)}
          </DetailRow>
          <DetailRow label={t('readingDetail.timingLabel')}>{timingText}</DetailRow>
          {reading.notes !== undefined && (
            <View style={styles.notesBlock}>
              <AppText color={colors.textMuted}>{t('readingDetail.notesLabel')}</AppText>
              <AppText style={styles.notes}>{reading.notes}</AppText>
            </View>
          )}
        </View>
      </Card>

      <Button
        label={t('readingDetail.edit')}
        onPress={() => router.push({ pathname: '/reading/[id]/edit', params: { id: reading.id } })}
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

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
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
    detailCard: {
      padding: 0,
      overflow: 'hidden',
    },
    hero: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    statusBadge: {
      alignSelf: 'center',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.lg,
    },
    heroValue: {
      textAlign: 'center',
    },
    rows: {
      padding: spacing.lg,
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
    notesBlock: {
      marginTop: spacing.xs,
      gap: spacing.xs,
    },
    notes: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.base,
    },
  });

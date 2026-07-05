import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MealTiming } from '@/domain/models/meal';
import { getReadingRepository } from '@/data/repositories/factory';
import { deleteReading } from '@/domain/use-cases/delete-reading';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { useReading } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, fontSize, fontWeight, radius, spacing } from '@/ui/theme';
import { formatDateTime, formatValue } from '@/ui/utils/format';
import { statusBgColor, statusColor } from '@/ui/utils/reading-display';

function DetailRow({ label, children }: { label: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{children}</Text>
    </View>
  );
}

export default function ReadingDetailScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preferredUnit, preferredLanguage, fastingRange, postMealRange } = useSettingsStore();
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
        <Text style={styles.notFound}>{t('readingDetail.notFound')}</Text>
      </View>
    );
  }

  const evaluation = evaluateReading(reading, { fasting: fastingRange, postMeal: postMealRange });
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
        <Text style={[styles.heroValue, { color: statusColor(evaluation) }]}>
          {formatValue(reading.value, preferredUnit)}
        </Text>
        <Text style={styles.heroUnit}>{preferredUnit}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor(evaluation) }]}>
          <Text style={styles.statusPillText}>{t(`status.${evaluation}`)}</Text>
        </View>
      </View>

      <View style={styles.card}>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.detailLabel}>{t('readingDetail.notesLabel')}</Text>
        <Text style={[styles.notes, reading.notes === undefined && styles.notesEmpty]}>
          {reading.notes ?? t('readingDetail.noNotes')}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push({ pathname: '/history/[id]/edit', params: { id: reading.id } })}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('readingDetail.edit')}
      >
        <Ionicons name="create-outline" size={22} color={colors.onPrimary} style={styles.buttonIcon} />
        <Text style={styles.editButtonText}>{t('readingDetail.edit')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDelete}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('readingDetail.delete')}
      >
        <Ionicons name="trash-outline" size={22} color={colors.error} style={styles.buttonIcon} />
        <Text style={styles.deleteButtonText}>{t('readingDetail.delete')}</Text>
      </TouchableOpacity>
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
  notFound: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  heroValue: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  heroUnit: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  statusPill: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  statusPillText: {
    color: colors.onPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  detailValue: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
    textAlign: 'right',
  },
  notes: {
    fontSize: fontSize.base,
    color: colors.text,
    marginTop: spacing.xs,
  },
  notesEmpty: {
    color: colors.textDisabled,
    fontStyle: 'italic',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 56,
  },
  editButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.onPrimary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    height: 56,
  },
  deleteButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
});

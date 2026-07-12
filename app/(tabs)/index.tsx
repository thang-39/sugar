import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ConditionType } from '@/domain/models/condition';
import type { TargetRanges } from '@/domain/models/target-range';
import { pregnancyWeek } from '@/domain/use-cases/pregnancy-week';
import { AppText, Button, Card } from '@/ui/components/ui';
import { ReadingCard } from '@/ui/components/reading-card';
import { useReadings } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

const DAY_MS = 86_400_000;

export default function TodayScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();

  const {
    conditionType,
    dueDate,
    preferredUnit,
    preferredLanguage,
    fastingRange,
    postMealRange,
    postMeal2hRange,
  } = useSettingsStore();

  // Local start-of-day so readings roll over at midnight in the device timezone.
  const dayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const { readings } = useReadings({ from: dayStart, to: dayStart + DAY_MS - 1 });

  // useReadings returns newest-first; the Today list reads chronologically.
  const todaysReadings = useMemo(
    () => readings.slice().sort((a, b) => a.recordedAt - b.recordedAt),
    [readings],
  );

  const ranges: TargetRanges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange, postMeal2h: postMeal2hRange ?? undefined }),
    [fastingRange, postMealRange, postMeal2hRange],
  );

  const isGestational = conditionType === ConditionType.Gestational && dueDate !== null;
  const week = isGestational && dueDate !== null ? pregnancyWeek(dueDate, Date.now()) : undefined;
  const daysUntilDue =
    dueDate !== null ? Math.max(0, Math.ceil((dueDate - Date.now()) / DAY_MS)) : undefined;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {isGestational ? (
          <>
            <AppText variant="title">{t('today.header.week', { week })}</AppText>
            <AppText color={colors.textMuted}>
              {t('today.header.dueCountdown', { days: daysUntilDue })}
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="title">{t('today.header.today')}</AppText>
            <AppText color={colors.textMuted}>{formatDate(new Date(), preferredLanguage)}</AppText>
          </>
        )}

        {todaysReadings.length > 0 ? (
          <Card style={styles.listCard}>
            {todaysReadings.map((reading) => (
              <ReadingCard
                key={reading.id}
                reading={reading}
                unit={preferredUnit}
                language={preferredLanguage}
                ranges={ranges}
                onPress={() =>
                  router.push({ pathname: '/history/[id]', params: { id: reading.id } })
                }
              />
            ))}
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="water-outline" size={48} color={colors.primary} />
            <AppText variant="heading" style={styles.emptyText}>
              {t('today.empty.title')}
            </AppText>
            <AppText color={colors.textMuted} style={styles.emptyText}>
              {t('today.empty.subtitle')}
            </AppText>
          </Card>
        )}

        <Button
          label={t('today.logReading')}
          icon="add"
          onPress={() => router.push('/(tabs)/log')}
          style={styles.logButton}
        />
        <Button
          label={t('today.addReminder')}
          icon="alarm-outline"
          variant="ghost"
          onPress={() => router.push('/(tabs)/settings/reminders?new=1')}
        />
        <Button
          label={t('today.exportReport')}
          variant="ghost"
          onPress={() => router.push('/(tabs)/settings/report')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1, gap: spacing.md },
  listCard: { gap: spacing.sm, padding: spacing.sm },
  emptyCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: 'center' },
  logButton: { marginTop: spacing.sm },
});

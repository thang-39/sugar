import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReadingListFilter } from '@/domain/repositories/reading-repository';
import { ReadingListItem } from '@/ui/components/reading-list-item';
import { useReadings } from '@/ui/hooks/use-readings';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { colors, fontSize, fontWeight, radius, spacing } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

const DAY_MS = 24 * 60 * 60 * 1000;

const FilterPreset = {
  All: 'all',
  Last7: 'last7',
  Last30: 'last30',
  Custom: 'custom',
} as const;
type FilterPreset = (typeof FilterPreset)[keyof typeof FilterPreset];

const PRESETS: readonly FilterPreset[] = [
  FilterPreset.All,
  FilterPreset.Last7,
  FilterPreset.Last30,
  FilterPreset.Custom,
];

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function rangeFor(preset: FilterPreset, customFrom: Date, customTo: Date): ReadingListFilter {
  switch (preset) {
    case FilterPreset.Last7:
      return { from: startOfDay(new Date(Date.now() - 6 * DAY_MS)) };
    case FilterPreset.Last30:
      return { from: startOfDay(new Date(Date.now() - 29 * DAY_MS)) };
    case FilterPreset.Custom:
      return { from: startOfDay(customFrom), to: endOfDay(customTo) };
    case FilterPreset.All:
    default:
      return {};
  }
}

export default function HistoryListScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { preferredUnit, preferredLanguage, fastingRange, postMealRange } = useSettingsStore();

  const [preset, setPreset] = useState<FilterPreset>(FilterPreset.All);
  const [customFrom, setCustomFrom] = useState<Date>(() => new Date(Date.now() - 29 * DAY_MS));
  const [customTo, setCustomTo] = useState<Date>(() => new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | undefined>(undefined);

  // useMemo pins the computed bounds until a dependency changes, so the "last N
  // days" snapshot doesn't drift on every render (which would thrash the hook).
  const filter = useMemo(
    () => rangeFor(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const { readings, isLoading, error } = useReadings(filter);
  const ranges = useMemo(
    () => ({ fasting: fastingRange, postMeal: postMealRange }),
    [fastingRange, postMealRange],
  );

  const onPickDate = (event: DateTimePickerEvent, selected?: Date): void => {
    const which = activePicker;
    if (Platform.OS !== 'ios') setActivePicker(undefined);
    if (!selected || which === undefined) return;
    if (which === 'from') setCustomFrom(selected);
    else setCustomTo(selected);
  };

  const renderHeader = (): ReactElement => (
    <View>
      <View style={styles.filterRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.filterChip, preset === p && styles.filterChipActive]}
            onPress={() => setPreset(p)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: preset === p }}
          >
            <Text style={[styles.filterChipText, preset === p && styles.filterChipTextActive]}>
              {t(`history.filters.${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {preset === FilterPreset.Custom && (
        <View style={styles.customRow}>
          <TouchableOpacity
            style={styles.customButton}
            onPress={() => setActivePicker('from')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('history.customRange.from')}: ${formatDate(customFrom, preferredLanguage)}`}
          >
            <Text style={styles.customLabel}>{t('history.customRange.from')}</Text>
            <Text style={styles.customValue}>{formatDate(customFrom, preferredLanguage)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.customButton}
            onPress={() => setActivePicker('to')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${t('history.customRange.to')}: ${formatDate(customTo, preferredLanguage)}`}
          >
            <Text style={styles.customLabel}>{t('history.customRange.to')}</Text>
            <Text style={styles.customValue}>{formatDate(customTo, preferredLanguage)}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.count}>{t('history.count', { n: readings.length })}</Text>
    </View>
  );

  const renderEmpty = (): ReactElement | null => {
    if (isLoading) return null;
    if (error !== undefined) {
      return (
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.emptyTitle}>{t('history.loadError')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.centerState}>
        <Ionicons name="clipboard-outline" size={56} color={colors.textDisabled} />
        <Text style={styles.emptyTitle}>{t('history.empty.title')}</Text>
        <Text style={styles.emptySubtitle}>{t('history.empty.subtitle')}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      {isLoading && readings.length === 0 ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={readings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReadingListItem
              reading={item}
              unit={preferredUnit}
              language={preferredLanguage}
              ranges={ranges}
              onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.id } })}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activePicker !== undefined && (
        <DateTimePicker
          value={activePicker === 'from' ? customFrom : customTo}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickDate}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  customRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  customButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  customLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
  },
  customValue: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

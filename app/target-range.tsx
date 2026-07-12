import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { TargetRange } from '@/domain/models/target-range';
import { Unit } from '@/domain/models/unit';
import { mgdlToMmol, mmolToMgdl } from '@/domain/use-cases/convert-unit';
import { AppText, Button, Card, Stepper } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';

// Physical clamps. mmol bounds are the mg/dL bounds converted (20→1.1, 600→33.3).
const BOUNDS = {
  [Unit.MgDl]: { low: 20, high: 600 },
  [Unit.MmolL]: { low: 1.1, high: 33.3 },
} as const;

type RangeKey = 'fastingRange' | 'postMealRange';

export default function TargetRangeScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { preferredUnit, fastingRange, postMealRange, updateSetting } = useSettingsStore();

  const isMmol = preferredUnit === Unit.MmolL;
  const step = isMmol ? 0.1 : 5;
  const bounds = BOUNDS[preferredUnit];

  const toDisplay = (mgdl: number): number => (isMmol ? mgdlToMmol(mgdl) : mgdl);
  const round = (v: number): number => (isMmol ? Math.round(v * 10) / 10 : Math.round(v));
  const format = (v: number): string => (isMmol ? v.toFixed(1) : String(v));

  // Working state lives in the DISPLAY unit; seeded once from the stored mg/dL.
  const [fasting, setFasting] = useState<TargetRange>(() => ({
    low: toDisplay(fastingRange.low),
    high: toDisplay(fastingRange.high),
  }));
  const [postMeal, setPostMeal] = useState<TargetRange>(() => ({
    low: toDisplay(postMealRange.low),
    high: toDisplay(postMealRange.high),
  }));

  const persist = (key: RangeKey, next: TargetRange): void => {
    const toMgdl = (v: number): number => (isMmol ? mmolToMgdl(v) : v);
    void updateSetting(key, { low: toMgdl(next.low), high: toMgdl(next.high) });
  };

  const change = (
    key: RangeKey,
    current: TargetRange,
    setter: (r: TargetRange) => void,
    patch: Partial<TargetRange>,
  ): void => {
    const next: TargetRange = {
      low: round(patch.low ?? current.low),
      high: round(patch.high ?? current.high),
    };
    setter(next);
    persist(key, next);
  };

  const renderCard = (
    title: string,
    icon: 'partly-sunny' | 'restaurant',
    iconColor: string,
    key: RangeKey,
    range: TargetRange,
    setter: (r: TargetRange) => void,
    rangeLabel: string,
  ): ReactElement => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <AppText variant="heading">{title}</AppText>
      </View>
      <Stepper
        label={t('screens.settings.targetRange.min')}
        value={range.low}
        min={bounds.low}
        max={range.high}
        step={step}
        formatValue={format}
        onChange={(v) => change(key, range, setter, { low: v })}
        decrementAccessibilityLabel={t('screens.settings.targetRange.a11y.minDecrease', {
          range: rangeLabel,
        })}
        incrementAccessibilityLabel={t('screens.settings.targetRange.a11y.minIncrease', {
          range: rangeLabel,
        })}
      />
      <Stepper
        label={t('screens.settings.targetRange.max')}
        value={range.high}
        min={range.low}
        max={bounds.high}
        step={step}
        formatValue={format}
        onChange={(v) => change(key, range, setter, { high: v })}
        decrementAccessibilityLabel={t('screens.settings.targetRange.a11y.maxDecrease', {
          range: rangeLabel,
        })}
        incrementAccessibilityLabel={t('screens.settings.targetRange.a11y.maxIncrease', {
          range: rangeLabel,
        })}
      />
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppText color={colors.textMuted} style={styles.helper}>
        {t('screens.settings.targetRange.helper', { unit: preferredUnit })}
      </AppText>

      {renderCard(
        t('screens.settings.targetRange.fasting'),
        'partly-sunny',
        colors.accentAmber,
        'fastingRange',
        fasting,
        setFasting,
        t('screens.settings.targetRange.fasting'),
      )}
      {renderCard(
        t('screens.settings.targetRange.postMeal'),
        'restaurant',
        colors.accentPurple,
        'postMealRange',
        postMeal,
        setPostMeal,
        t('screens.settings.targetRange.postMeal'),
      )}

      <Button
        variant="primary"
        label={t('screens.settings.targetRange.done')}
        onPress={() => router.back()}
        style={styles.done}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  helper: {
    marginBottom: spacing.xs,
  },
  card: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  done: {
    marginTop: spacing.sm,
  },
});

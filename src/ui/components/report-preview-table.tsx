import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';

import type { MealCell, ReportModel, SubCell } from '@/domain/models/report';
import { RangeEvaluation } from '@/domain/models/target-range';
import { AppText } from '@/ui/components/ui';
import { radius, spacing, useTheme } from '@/ui/theme';

/** Same shape as the report i18n `columns` block (see Task 8). */
export interface ReportPreviewLabels {
  date: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  before: string;
  after: string;
  hour1: string;
  hour2: string;
}

interface ReportPreviewTableProps {
  model: ReportModel;
  labels: ReportPreviewLabels;
}

const OUT_BG = '#FDECE4';
const OUT_FG = '#B23C10';
const DATE_FLEX = 1.1;

export function ReportPreviewTable({ model, labels }: ReportPreviewTableProps): ReactElement {
  const colors = useTheme();
  const { hasSecondHour } = model;
  const mealNames = [labels.breakfast, labels.lunch, labels.dinner];
  const subLabels = hasSecondHour
    ? [labels.before, labels.hour1, labels.hour2]
    : [labels.before, labels.after];
  const subCount = subLabels.length;

  const subCellsOf = (meal: MealCell): SubCell[] =>
    hasSecondHour ? [meal.before, meal.after, meal.after2h] : [meal.before, meal.after];

  return (
    <View style={[styles.table, { borderColor: colors.border }]}>
      {/* Group header: meal names spanning their sub-columns. */}
      <View style={styles.row}>
        <View style={[styles.dateCol, styles.headCell]} />
        {mealNames.map((name) => (
          <View key={name} style={[styles.mealGroup, { flex: subCount }]}>
            <View style={styles.headCell}>
              <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
                {name}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      {/* Sub header: Trước / Sau (or Trước / 1h / 2h). */}
      <View style={[styles.row, styles.borderTop, { borderColor: colors.border }]}>
        <View style={[styles.dateCol, styles.headCell]}>
          <AppText variant="caption" weight="extrabold" color={colors.textMuted}>
            {labels.date}
          </AppText>
        </View>
        {mealNames.map((name) => (
          <View key={name} style={[styles.subRow, { flex: subCount }]}>
            {subLabels.map((s, i) => (
              <View key={i} style={styles.subCell}>
                <AppText variant="caption" weight="bold" color={colors.textFaint}>
                  {s}
                </AppText>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Data rows. */}
      {model.rows.map((row) => (
        <View key={row.date} style={[styles.row, styles.borderTop, { borderColor: colors.border }]}>
          <View style={[styles.dateCol, styles.subCell]}>
            <AppText variant="caption" color={colors.textMuted}>
              {row.date}
            </AppText>
          </View>
          {row.meals.map((meal, mi) => (
            <View key={mi} style={[styles.subRow, { flex: subCount }]}>
              {subCellsOf(meal).map((cell, ci) => {
                const out = cell.isOutOfRange;
                return (
                  <View key={ci} style={[styles.subCell, out && { backgroundColor: OUT_BG }]}>
                    <AppText
                      variant="caption"
                      weight={out ? 'extrabold' : 'bold'}
                      color={
                        out
                          ? OUT_FG
                          : cell.status === RangeEvaluation.InRange
                            ? colors.text
                            : colors.textFaint
                      }
                    >
                      {cell.value ?? '—'}
                    </AppText>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  borderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateCol: {
    flex: DATE_FLEX,
  },
  mealGroup: {
    alignItems: 'center',
  },
  subRow: {
    flexDirection: 'row',
  },
  headCell: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCell: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

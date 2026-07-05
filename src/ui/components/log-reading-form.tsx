import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useSettingsStore } from '@/ui/hooks/use-settings';
import { Unit } from '@/domain/models/unit';
import { MealType, MealTiming } from '@/domain/models/meal';
import type { Reading } from '@/domain/models/reading';
import { RangeEvaluation } from '@/domain/models/target-range';
import {
  validateReadingValue,
  type ValueValidationError,
} from '@/domain/use-cases/validate-reading-value';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { createReading } from '@/domain/use-cases/create-reading';
import { updateReading } from '@/domain/use-cases/update-reading';
import { mgdlToMmol } from '@/domain/use-cases/convert-unit';
import { readingUseCaseDeps } from '@/data/repositories/factory';
import { getDefaultMealType, convertValueString } from '@/ui/utils/log-form';
import { formatDateTime } from '@/ui/utils/format';
import { haptics } from '@/ui/utils/haptics';
import { mealIcon } from '@/ui/utils/meal-display';
import { colors, spacing, radius, fontSize, fontFamily, mealColor } from '@/ui/theme';
import {
  AppText,
  Button,
  Card,
  Chip,
  DISPLAY_MAX_FONT_SCALE,
  Notice,
  SectionLabel,
  SegmentedControl,
} from '@/ui/components/ui';

const VALIDATION_KEY: Record<ValueValidationError, string> = {
  empty: 'empty',
  'not-a-number': 'notANumber',
  'not-integer': 'notInteger',
  'too-precise': 'tooPrecise',
};

const MEAL_TYPES: readonly MealType[] = [
  MealType.Breakfast,
  MealType.Lunch,
  MealType.Dinner,
  MealType.Snack,
];

const HOUR_OPTIONS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

interface LogReadingFormProps {
  /** When provided, the form runs in edit mode: prefilled and saving via updateReading. */
  initialReading?: Reading;
  /** Called after a successful save in edit mode (create mode resets the form instead). */
  onSaved?: (reading: Reading) => void;
}

/** Stored mg/dL → the string to prefill the value input in the preferred unit. */
function initialValueString(mgdl: number, unit: Unit): string {
  return unit === Unit.MmolL ? mgdlToMmol(mgdl).toString() : mgdl.toString();
}

export function LogReadingForm({
  initialReading,
  onSaved,
}: LogReadingFormProps = {}): React.JSX.Element {
  const { t } = useTranslation();
  const {
    preferredUnit,
    preferredLanguage,
    fastingRange,
    postMealRange,
    alertsEnabled,
    updateSetting,
  } = useSettingsStore();

  const isEdit = initialReading !== undefined;

  // Form state — prefilled from initialReading when editing.
  const [valueStr, setValueStr] = useState(() =>
    initialReading ? initialValueString(initialReading.value, preferredUnit) : '',
  );
  const [mealType, setMealType] = useState<MealType>(
    () => initialReading?.mealType ?? getDefaultMealType(new Date()),
  );
  // Editing counts as an explicit meal-type choice, so changing the time never
  // clobbers the stored value.
  const [isMealTypeManual, setIsMealTypeManual] = useState(isEdit);
  const [mealTiming, setMealTiming] = useState<MealTiming>(
    initialReading?.mealTiming ?? MealTiming.Before,
  );
  const [hoursAfterMeal, setHoursAfterMeal] = useState(initialReading?.hoursAfterMeal ?? 2);
  const [notes, setNotes] = useState(initialReading?.notes ?? '');
  const [recordedAt, setRecordedAt] = useState<Date>(() =>
    initialReading ? new Date(initialReading.recordedAt) : new Date(),
  );

  // UI flow state
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(
    () => (initialReading?.notes ?? '').length > 0,
  );

  // Date/time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  const handleUnitChange = async (nextUnit: Unit): Promise<void> => {
    if (nextUnit === preferredUnit) return;
    // Preserve the typed number across the switch (PRD round-trip rule).
    setValueStr((prev) => convertValueString(prev, preferredUnit, nextUnit));
    await updateSetting('preferredUnit', nextUnit);
  };

  // Re-derive the smart default only when the user has not picked a meal type,
  // so adjusting the time never clobbers an explicit choice.
  const applyRecordedAt = (next: Date): void => {
    setRecordedAt(next);
    if (!isMealTypeManual) setMealType(getDefaultMealType(next));
  };

  const onChangeDateTime = (event: DateTimePickerEvent, selectedDate?: Date): void => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (!selectedDate) return;
      if (pickerMode === 'date') {
        const next = new Date(recordedAt);
        next.setFullYear(selectedDate.getFullYear());
        next.setMonth(selectedDate.getMonth());
        next.setDate(selectedDate.getDate());
        applyRecordedAt(next);
        setPickerMode('time');
        setTimeout(() => setShowDatePicker(true), 100);
      } else {
        const next = new Date(recordedAt);
        next.setHours(selectedDate.getHours());
        next.setMinutes(selectedDate.getMinutes());
        applyRecordedAt(next);
      }
    } else if (selectedDate) {
      applyRecordedAt(selectedDate);
    }
  };

  const triggerPicker = (): void => {
    setPickerMode('date');
    setShowDatePicker(true);
  };

  const selectMealType = (type: MealType): void => {
    setMealType(type);
    setIsMealTypeManual(true);
  };

  const resetForm = (): void => {
    setValueStr('');
    setNotes('');
    setIsNotesExpanded(false);
    const now = new Date();
    setRecordedAt(now);
    setMealType(getDefaultMealType(now));
    setIsMealTypeManual(false);
    setMealTiming(MealTiming.Before);
    setHoursAfterMeal(2);
    setInputError(null);
  };

  const showSavedAlert = (reading: Reading, evaluation: RangeEvaluation): void => {
    // Create mode resets for the next entry; edit mode hands control back to the caller.
    const onDone = (): void => {
      if (isEdit) onSaved?.(reading);
      else resetForm();
    };
    const okButton = [{ text: t('common.ok'), onPress: onDone }];
    const baseMessage = isEdit
      ? t('logForm.alerts.updatedMessage')
      : t('logForm.alerts.savedMessage');
    if (!alertsEnabled || evaluation === RangeEvaluation.InRange) {
      Alert.alert(t('logForm.alerts.savedTitle'), baseMessage, okButton);
      return;
    }
    const displayVal = preferredUnit === Unit.MmolL ? mgdlToMmol(reading.value) : reading.value;
    const messageKey = evaluation === RangeEvaluation.Low ? 'rangeSavedLow' : 'rangeSavedHigh';
    Alert.alert(
      t('logForm.alerts.savedTitle'),
      t(`logForm.alerts.${messageKey}`, { value: displayVal, unit: preferredUnit }),
      okButton,
    );
  };

  const performSave = async (mgdl: number): Promise<void> => {
    try {
      setIsSaving(true);
      const input = {
        value: mgdl,
        mealType,
        mealTiming,
        hoursAfterMeal: mealTiming === MealTiming.After ? hoursAfterMeal : undefined,
        notes: notes.trim() || undefined,
        recordedAt: recordedAt.getTime(),
      };
      // updateReading preserves createdAt and bumps updatedAt; createReading stamps both.
      const reading =
        initialReading !== undefined
          ? await updateReading(initialReading.id, input, readingUseCaseDeps())
          : await createReading(input, readingUseCaseDeps());

      const evaluation = evaluateReading(reading, {
        fasting: fastingRange,
        postMeal: postMealRange,
      });
      // Out-of-range success still saved — warn haptic; in-range → success.
      void (evaluation === RangeEvaluation.InRange ? haptics.success() : haptics.warning());
      showSavedAlert(reading, evaluation);
    } catch (err) {
      console.error('Failed to save reading:', err);
      void haptics.error();
      Alert.alert(t('common.errorTitle'), t('common.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const onSave = async (): Promise<void> => {
    const validation = validateReadingValue(valueStr, preferredUnit);
    if (!validation.ok) {
      setInputError(t(`logForm.validation.${VALIDATION_KEY[validation.reason]}`));
      return;
    }
    setInputError(null);

    const { mgdl, withinNormalRange } = validation;
    if (!withinNormalRange) {
      void haptics.warning();
      // Value is numeric but outside physical bounds — warn-only, never hard-block.
      Alert.alert(t('logForm.alerts.outOfBoundsTitle'), t('logForm.alerts.outOfBoundsMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('logForm.alerts.saveAnyway'),
          onPress: () => {
            void performSave(mgdl);
          },
        },
      ]);
      return;
    }
    await performSave(mgdl);
  };

  const formatRecordedAt = (date: Date): string => formatDateTime(date, preferredLanguage);

  return (
    <View style={styles.container}>
      {/* Value Input Card */}
      <Card style={styles.valueCard}>
        <SectionLabel>{t('logForm.valueLabel')}</SectionLabel>

        <View style={styles.valueRow}>
          <TextInput
            style={styles.valueInput}
            value={valueStr}
            onChangeText={(text) => {
              setValueStr(text);
              if (inputError) setInputError(null);
            }}
            placeholder={t('logForm.valuePlaceholder')}
            placeholderTextColor={colors.textDisabled}
            keyboardType={preferredUnit === Unit.MmolL ? 'decimal-pad' : 'number-pad'}
            maxLength={6}
            maxFontSizeMultiplier={DISPLAY_MAX_FONT_SCALE}
            accessibilityLabel={t('logForm.a11y.valueInput')}
          />
        </View>

        <SegmentedControl
          value={preferredUnit}
          onChange={(unit) => {
            void handleUnitChange(unit);
          }}
          activeColor={colors.primaryButton}
          segments={[
            {
              value: Unit.MgDl,
              label: 'mg/dL',
              accessibilityLabel: t('logForm.a11y.unitToggle', { unit: 'mg/dL' }),
            },
            {
              value: Unit.MmolL,
              label: 'mmol/L',
              accessibilityLabel: t('logForm.a11y.unitToggle', { unit: 'mmol/L' }),
            },
          ]}
          style={styles.unitToggle}
          segmentStyle={styles.unitToggleSegment}
        />

        {inputError && <Notice message={inputError} tone="warn" style={styles.validationError} />}
      </Card>

      {/* Meal Context Section */}
      <View style={styles.section}>
        <SectionLabel>{t('logForm.mealTypeLabel')}</SectionLabel>
        <View style={styles.mealTypeGrid}>
          {MEAL_TYPES.map((type) => (
            <Chip
              key={type}
              label={t(`logForm.mealTypes.${type}`)}
              icon={mealIcon[type]}
              selected={mealType === type}
              activeColor={mealColor[type]}
              onPress={() => selectMealType(type)}
              accessibilityLabel={t('logForm.a11y.mealChip', {
                meal: t(`logForm.mealTypes.${type}`),
              })}
              style={styles.mealChip}
            />
          ))}
        </View>

        {/* Before / After Meal Timing Switch */}
        <SectionLabel style={styles.timingLabel}>{t('logForm.mealTimingLabel')}</SectionLabel>
        <SegmentedControl
          value={mealTiming}
          onChange={setMealTiming}
          activeColor={colors.primaryButton}
          segments={[
            {
              value: MealTiming.Before,
              label: t('logForm.mealTimings.Before'),
              accessibilityLabel: t('logForm.a11y.timingToggle', {
                timing: t('logForm.mealTimings.Before'),
              }),
            },
            {
              value: MealTiming.After,
              label: t('logForm.mealTimings.After'),
              accessibilityLabel: t('logForm.a11y.timingToggle', {
                timing: t('logForm.mealTimings.After'),
              }),
            },
          ]}
          style={styles.timing}
        />

        {/* Hours After Meal — chip row (design 0h–6h) */}
        {mealTiming === MealTiming.After && (
          <View style={styles.hoursSection}>
            <AppText variant="caption" weight="bold" color={colors.textMuted}>
              {t('logForm.hoursAfterLabel')}
            </AppText>
            <View style={styles.hoursGrid}>
              {HOUR_OPTIONS.map((h) => (
                <Chip
                  key={h}
                  label={t('logForm.hoursChip', { h })}
                  selected={hoursAfterMeal === h}
                  activeColor={colors.primaryButton}
                  onPress={() => setHoursAfterMeal(h)}
                  accessibilityLabel={t('logForm.a11y.hoursChip', { hours: h })}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Date Time Picker Button */}
      <View style={styles.section}>
        <SectionLabel>{t('logForm.recordedAtLabel')}</SectionLabel>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={triggerPicker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('logForm.a11y.dateButton', { value: formatRecordedAt(recordedAt) })}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <AppText weight="bold" style={styles.dateTimeText}>
            {formatRecordedAt(recordedAt)}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Collapsed/Expanded Notes */}
      {!isNotesExpanded ? (
        <TouchableOpacity
          style={styles.notesCollapsed}
          onPress={() => setIsNotesExpanded(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('logForm.a11y.notesToggle')}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
          <AppText weight="extrabold" color={colors.primary}>
            {t('logForm.notesLabel')}
          </AppText>
        </TouchableOpacity>
      ) : (
        <View style={styles.notesExpanded}>
          <SectionLabel>{t('logForm.notesLabel')}</SectionLabel>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            maxLength={500}
            multiline
            placeholder={t('logForm.notesPlaceholder')}
            placeholderTextColor={colors.textDisabled}
            accessibilityLabel={t('logForm.notesLabel')}
          />
          <AppText variant="caption" style={styles.charCount}>
            {notes.length}/500
          </AppText>
        </View>
      )}

      {/* Save Button */}
      <Button
        label={isEdit ? t('logForm.updateButton') : t('logForm.saveButton')}
        onPress={() => {
          void onSave();
        }}
        isLoading={isSaving}
        accessibilityLabel={t('logForm.a11y.save')}
        style={styles.saveButton}
      />

      {/* iOS Date Picker Modal */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={recordedAt}
                mode="datetime"
                display="spinner"
                onChange={onChangeDateTime}
              />
              <Button
                label={t('common.done')}
                onPress={() => setShowDatePicker(false)}
                style={styles.modalDone}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date Picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={recordedAt}
          mode={pickerMode}
          display="default"
          onChange={onChangeDateTime}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  valueCard: {
    marginBottom: spacing.lg,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  valueInput: {
    fontSize: fontSize.display,
    fontFamily: fontFamily.black,
    color: colors.text,
    textAlign: 'center',
    minWidth: 150,
    flexShrink: 1,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
  },
  unitToggle: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
  unitToggleSegment: {
    minHeight: 52,
  },
  validationError: {
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  mealChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minHeight: 52,
  },
  timingLabel: {
    marginTop: spacing.lg,
  },
  timing: {
    marginTop: spacing.sm,
  },
  hoursSection: {
    marginTop: spacing.md,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  dateTimeText: {
    color: colors.text,
  },
  notesCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  notesExpanded: {
    marginBottom: spacing.lg,
  },
  notesInput: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  charCount: {
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
  },
  modalDone: {
    marginTop: spacing.md,
  },
});

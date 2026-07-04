import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { useSettingsStore } from '@/ui/hooks/use-settings';
import { Unit } from '@/domain/models/unit';
import { MealType, MealTiming } from '@/domain/models/meal';
import { RangeEvaluation } from '@/domain/models/target-range';
import {
  validateReadingValue,
  type ValueValidationError,
} from '@/domain/use-cases/validate-reading-value';
import { evaluateReading } from '@/domain/use-cases/evaluate-reading';
import { createReading } from '@/domain/use-cases/create-reading';
import { mgdlToMmol } from '@/domain/use-cases/convert-unit';
import { SqliteReadingRepository } from '@/data/repositories/sqlite-reading-repository';
import { getDb } from '@/data/db/client';
import { generateId } from '@/data/id';
import { getDefaultMealType, convertValueString } from '@/ui/utils/log-form';
import { colors, spacing, radius, fontSize, fontWeight } from '@/ui/theme';

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

export function LogReadingForm(): React.JSX.Element {
  const { t } = useTranslation();
  const {
    preferredUnit,
    preferredLanguage,
    fastingRange,
    postMealRange,
    alertsEnabled,
    updateSetting,
  } = useSettingsStore();

  // Form state
  const [valueStr, setValueStr] = useState('');
  const [mealType, setMealType] = useState<MealType>(() => getDefaultMealType(new Date()));
  const [isMealTypeManual, setIsMealTypeManual] = useState(false);
  const [mealTiming, setMealTiming] = useState<MealTiming>(MealTiming.Before);
  const [hoursAfterMeal, setHoursAfterMeal] = useState(2);
  const [notes, setNotes] = useState('');
  const [recordedAt, setRecordedAt] = useState<Date>(() => new Date());

  // UI flow state
  const [inputError, setInputError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

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

  const showSavedAlert = (mgdlValue: number, evaluation: RangeEvaluation): void => {
    const okButton = [{ text: t('common.ok'), onPress: resetForm }];
    if (!alertsEnabled || evaluation === RangeEvaluation.InRange) {
      Alert.alert(t('logForm.alerts.savedTitle'), t('logForm.alerts.savedMessage'), okButton);
      return;
    }
    const displayVal = preferredUnit === Unit.MmolL ? mgdlToMmol(mgdlValue) : mgdlValue;
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
      const reading = await createReading(
        {
          value: mgdl,
          mealType,
          mealTiming,
          hoursAfterMeal: mealTiming === MealTiming.After ? hoursAfterMeal : undefined,
          notes: notes.trim() || undefined,
          recordedAt: recordedAt.getTime(),
        },
        { repository: new SqliteReadingRepository(getDb()), generateId, now: Date.now },
      );

      const evaluation = evaluateReading(reading, {
        fasting: fastingRange,
        postMeal: postMealRange,
      });
      showSavedAlert(reading.value, evaluation);
    } catch (err) {
      console.error('Failed to save reading:', err);
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

  const formatRecordedAt = (date: Date): string => {
    const pad = (n: number): string => n.toString().padStart(2, '0');
    if (preferredLanguage === 'vi') {
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Value Input Card */}
      <View style={styles.valueCard}>
        <Text style={styles.valueCardLabel}>{t('screens.log.title').toUpperCase()}</Text>
        <View style={styles.valueInputRow}>
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
            accessibilityLabel={t('logForm.a11y.valueInput')}
          />
        </View>

        {/* Unit Toggle Segmented Control */}
        <View style={styles.unitToggleContainer}>
          <TouchableOpacity
            style={[styles.unitTab, preferredUnit === Unit.MgDl && styles.activeUnitTab]}
            onPress={() => handleUnitChange(Unit.MgDl)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: preferredUnit === Unit.MgDl }}
            accessibilityLabel={t('logForm.a11y.unitToggle', { unit: 'mg/dL' })}
          >
            <Text
              style={[styles.unitTabText, preferredUnit === Unit.MgDl && styles.activeUnitTabText]}
            >
              mg/dL
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitTab, preferredUnit === Unit.MmolL && styles.activeUnitTab]}
            onPress={() => handleUnitChange(Unit.MmolL)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: preferredUnit === Unit.MmolL }}
            accessibilityLabel={t('logForm.a11y.unitToggle', { unit: 'mmol/L' })}
          >
            <Text
              style={[styles.unitTabText, preferredUnit === Unit.MmolL && styles.activeUnitTabText]}
            >
              mmol/L
            </Text>
          </TouchableOpacity>
        </View>

        {inputError && <Text style={styles.validationErrorText}>{inputError}</Text>}
      </View>

      {/* Meal Context Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('logForm.mealTypeLabel')}</Text>
        <View style={styles.mealTypeGrid}>
          {MEAL_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.mealChip, mealType === type && styles.activeMealChip]}
              onPress={() => selectMealType(type)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: mealType === type }}
              accessibilityLabel={t('logForm.a11y.mealChip', {
                meal: t(`logForm.mealTypes.${type}`),
              })}
            >
              <Text style={[styles.mealChipText, mealType === type && styles.activeMealChipText]}>
                {t(`logForm.mealTypes.${type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Before / After Meal Timing Switch */}
        <View style={styles.timingContainer}>
          <TouchableOpacity
            style={[styles.timingButton, mealTiming === MealTiming.Before && styles.activeTimingButton]}
            onPress={() => setMealTiming(MealTiming.Before)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: mealTiming === MealTiming.Before }}
            accessibilityLabel={t('logForm.a11y.timingToggle', {
              timing: t('logForm.mealTimings.Before'),
            })}
          >
            <Text
              style={[
                styles.timingButtonText,
                mealTiming === MealTiming.Before && styles.activeTimingButtonText,
              ]}
            >
              {t('logForm.mealTimings.Before')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timingButton, mealTiming === MealTiming.After && styles.activeTimingButton]}
            onPress={() => setMealTiming(MealTiming.After)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: mealTiming === MealTiming.After }}
            accessibilityLabel={t('logForm.a11y.timingToggle', {
              timing: t('logForm.mealTimings.After'),
            })}
          >
            <Text
              style={[
                styles.timingButtonText,
                mealTiming === MealTiming.After && styles.activeTimingButtonText,
              ]}
            >
              {t('logForm.mealTimings.After')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hours After Meal Stepper */}
        {mealTiming === MealTiming.After && (
          <View style={styles.stepperContainer}>
            <Text style={styles.stepperLabel}>{t('logForm.hoursAfterLabel')}</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={[styles.stepperButton, hoursAfterMeal <= 0 && styles.stepperButtonDisabled]}
                disabled={hoursAfterMeal <= 0}
                onPress={() => setHoursAfterMeal((h) => Math.max(0, h - 1))}
                accessibilityRole="button"
                accessibilityState={{ disabled: hoursAfterMeal <= 0 }}
                accessibilityLabel={t('logForm.a11y.hoursDecrease')}
              >
                <Ionicons name="remove" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepperValueText}>
                {hoursAfterMeal} {t('logForm.hoursSuffix')}
              </Text>
              <TouchableOpacity
                style={[styles.stepperButton, hoursAfterMeal >= 6 && styles.stepperButtonDisabled]}
                disabled={hoursAfterMeal >= 6}
                onPress={() => setHoursAfterMeal((h) => Math.min(6, h + 1))}
                accessibilityRole="button"
                accessibilityState={{ disabled: hoursAfterMeal >= 6 }}
                accessibilityLabel={t('logForm.a11y.hoursIncrease')}
              >
                <Ionicons name="add" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Date Time Picker Button */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('logForm.recordedAtLabel')}</Text>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={triggerPicker}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('logForm.a11y.dateButton', { value: formatRecordedAt(recordedAt) })}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <Text style={styles.dateTimeButtonText}>{formatRecordedAt(recordedAt)}</Text>
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
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <Text style={styles.notesCollapsedText}>{t('logForm.notesLabel')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.notesExpandedContainer}>
          <Text style={styles.sectionLabel}>{t('logForm.notesLabel')}</Text>
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
          <Text style={styles.charCount}>{notes.length}/500</Text>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
        onPress={onSave}
        disabled={isSaving}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving, busy: isSaving }}
        accessibilityLabel={t('logForm.a11y.save')}
      >
        {isSaving ? (
          <ActivityIndicator
            size="small"
            color={colors.onPrimary}
            style={styles.saveButtonIcon}
          />
        ) : (
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color={colors.onPrimary}
            style={styles.saveButtonIcon}
          />
        )}
        <Text style={styles.saveButtonText}>
          {isSaving ? t('logForm.saving') : t('logForm.saveButton')}
        </Text>
      </TouchableOpacity>

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
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDatePicker(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.done')}
              >
                <Text style={styles.modalCloseButtonText}>{t('common.done')}</Text>
              </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  valueCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  valueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  valueInput: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    minWidth: 150,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    padding: 2,
    marginTop: spacing.md,
  },
  unitTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  activeUnitTab: {
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  unitTabText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  activeUnitTabText: {
    color: colors.primary,
  },
  validationErrorText: {
    color: colors.error,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealChip: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeMealChip: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  mealChipText: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  activeMealChipText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  timingContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  timingButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTimingButton: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  timingButtonText: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  activeTimingButtonText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 56,
    marginTop: spacing.md,
  },
  stepperLabel: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.5,
  },
  stepperValueText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 50,
    textAlign: 'center',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 56,
    paddingHorizontal: spacing.md,
  },
  dateTimeButtonText: {
    fontSize: fontSize.base,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  notesCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  notesCollapsedText: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  notesExpandedContainer: {
    marginBottom: spacing.xl,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    height: 100,
    textAlignVertical: 'top',
    marginTop: spacing.sm,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: spacing.xxl,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonIcon: {
    marginRight: spacing.sm,
  },
  saveButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.onPrimary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalCloseButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.onPrimary,
  },
});

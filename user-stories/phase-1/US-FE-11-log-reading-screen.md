# US-FE-11 — Log Reading Screen

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 1: Log a blood sugar reading with current date/time
- US 2: Tag a reading with a meal type
- US 3: Specify before or after a meal
- US 4: Specify hours after a meal
- US 5: Add optional free-text notes (max 500 chars)
- US 8: See a confirmation after saving
- US 43: Unit toggle on the form

## Goal
Build the core Log Reading screen — a single scrollable form with smart defaults, unit conversion, validation, and WatermelonDB persistence. This is the most important screen in Phase 1.

---

## Steps

### 1. Create the Screen

**`src/ui/screens/LogReadingScreen.tsx`**

```tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, SafeAreaView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { readingRepository } from '../../data/repositories/ReadingRepository';
import { useAppStore, PreferredUnit } from '../../data/stores/useAppStore';
import { validateReading } from '../../domain/useCases/ValidateReading';
import { fromDisplayValue, toDisplayValue } from '../../utils/unitConversion';
import { formatDateTime } from '../../utils/dateUtils';
import { MealType, MealTiming, ReadingInput } from '../../domain/models/Reading';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_TIMINGS: MealTiming[] = ['Before', 'After'];
const HOURS_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

// ──────────────────────────────────────────────
// Form state
// ──────────────────────────────────────────────
interface FormState {
  value: string;               // User input (in preferred unit, not mg/dL)
  unit: PreferredUnit;
  recordedAt: Date;
  showDatePicker: boolean;
  showTimePicker: boolean;
  mealType: MealType;
  mealTiming: MealTiming;
  hoursAfterMeal: number;
  notes: string;
  notesExpanded: boolean;
}

const defaultForm = (): FormState => ({
  value: '',
  unit: 'mg/dL',
  recordedAt: new Date(),
  showDatePicker: false,
  showTimePicker: false,
  mealType: 'Breakfast',
  mealTiming: 'Before',
  hoursAfterMeal: 2,
  notes: '',
  notesExpanded: false,
});

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────
export default function LogReadingScreen() {
  const preferredUnit = useAppStore(s => s.preferredUnit);
  const userId = useAppStore(s => s.userId);

  const [form, setForm] = useState<FormState>({
    ...defaultForm(),
    unit: preferredUnit,
  });

  // ── Field updates ────────────────────────────
  const setValue = (value: string) => setForm(f => ({ ...f, value }));

  const toggleUnit = () =>
    setForm(f => ({
      ...f,
      unit: f.unit === 'mg/dL' ? 'mmol/L' : 'mg/dL',
      value: f.value, // user must re-enter after toggle
    }));

  const setMealType = (mealType: MealType) => setForm(f => ({ ...f, mealType }));

  const setMealTiming = (mealTiming: MealTiming) =>
    setForm(f => ({ ...f, mealTiming, hoursAfterMeal: f.mealTiming === 'After' ? f.hoursAfterMeal : 2 }));

  const setHoursAfterMeal = (hoursAfterMeal: number) =>
    setForm(f => ({ ...f, hoursAfterMeal }));

  const setNotes = (notes: string) =>
    setForm(f => ({ ...f, notes: notes.slice(0, 500) })); // max 500 chars

  const setRecordedAt = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setForm(f => ({ ...f, showDatePicker: false, showTimePicker: false }));
    if (date) setForm(f => ({ ...f, recordedAt: date }));
  };

  // ── Validation ──────────────────────────────
  const numValue = parseFloat(form.value);
  const isValidNumber = !isNaN(numValue) && form.value.trim() !== '';

  let valueError = '';
  if (form.value && !isValidNumber) valueError = 'Enter a valid number';
  else if (isValidNumber && !Number.isInteger(numValue) && form.unit === 'mg/dL')
    valueError = 'Blood sugar must be a whole number';

  // ── Save handler ──────────────────────────────
  const handleSave = async () => {
    if (!isValidNumber) {
      Alert.alert('Missing value', 'Please enter your blood sugar reading.');
      return;
    }

    // Convert to mg/dL for storage
    const mgdlValue = fromDisplayValue(numValue, form.unit);

    // Validate
    const result = validateReading(mgdlValue, form.mealTiming);
    if (!result.valid) {
      Alert.alert('Invalid value', result.warning!);
      return;
    }

    // Warn if out of range
    if (result.warning) {
      Alert.alert('Warning', result.warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => saveReading(mgdlValue) },
      ]);
      return;
    }

    await saveReading(mgdlValue);
  };

  const saveReading = async (mgdlValue: number) => {
    const input: ReadingInput = {
      value: mgdlValue,
      mealType: form.mealType,
      mealTiming: form.mealTiming,
      hoursAfterMeal: form.mealTiming === 'After' ? form.hoursAfterMeal : null,
      notes: form.notes || null,
      recordedAt: form.recordedAt.getTime(),
    };

    try {
      await readingRepository.create(input, userId);
      Alert.alert('Saved', 'Your reading has been recorded.');
      setForm(defaultForm());
      setForm(f => ({ ...f, unit: preferredUnit }));
    } catch (err) {
      Alert.alert('Error', 'Failed to save reading. Please try again.');
      console.error('[LogReading] Save error:', err);
    }
  };

  const displayValue = isValidNumber
    ? toDisplayValue(numValue, form.unit)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* ── Header ───────────────────────── */}
        <Text style={styles.screenTitle}>Log a Reading</Text>

        {/* ── Blood Sugar Value ─────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Blood Sugar</Text>
          <View style={styles.valueRow}>
            <TextInput
              style={[styles.valueInput, valueError ? styles.inputError : null]}
              value={form.value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="Enter value"
              accessibilityLabel="Blood sugar value"
            />
            <TouchableOpacity
              style={styles.unitToggle}
              onPress={toggleUnit}
              accessibilityLabel={`Switch unit to ${form.unit === 'mg/dL' ? 'mmol/L' : 'mg/dL'}`}
            >
              <Text style={styles.unitToggleText}>{form.unit}</Text>
            </TouchableOpacity>
          </View>
          {displayValue !== null && form.unit === 'mmol/L' && (
            <Text style={styles.secondaryValue}>
              = {displayValue} mmol/L
            </Text>
          )}
          {valueError ? <Text style={styles.errorText}>{valueError}</Text> : null}
        </View>

        {/* ── Date & Time ────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date & Time</Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setForm(f => ({ ...f, showDatePicker: true, showTimePicker: false }))}
            >
              <Text style={styles.dateButtonText}>
                {formatDateTime(form.recordedAt.getTime())}
              </Text>
            </TouchableOpacity>
          </View>
          {form.showDatePicker && (
            <DateTimePicker
              value={form.recordedAt}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={setRecordedAt}
            />
          )}
        </View>

        {/* ── Meal Type ──────────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Meal</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, form.mealType === type && styles.chipActive]}
                onPress={() => setMealType(type)}
                accessibilityLabel={`Select ${type}`}
              >
                <Text style={[styles.chipText, form.mealType === type && styles.chipTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Before / After ─────────────────── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Timing</Text>
          <View style={styles.chipRow}>
            {MEAL_TIMINGS.map(timing => (
              <TouchableOpacity
                key={timing}
                style={[styles.chip, form.mealTiming === timing && styles.chipActive]}
                onPress={() => setMealTiming(timing)}
                accessibilityLabel={`Select ${timing} meal`}
              >
                <Text style={[styles.chipText, form.mealTiming === timing && styles.chipTextActive]}>
                  {timing}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Hours After Meal (conditional) ─── */}
        {form.mealTiming === 'After' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Hours After Meal</Text>
            <View style={styles.chipRow}>
              {HOURS_OPTIONS.map(h => (
                <TouchableOpacity
                  key={h}
                  style={[styles.chip, form.hoursAfterMeal === h && styles.chipActive]}
                  onPress={() => setHoursAfterMeal(h)}
                  accessibilityLabel={`${h} hours after`}
                >
                  <Text style={[styles.chipText, form.hoursAfterMeal === h && styles.chipTextActive]}>
                    {h}h
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Notes (collapsible) ─────────────── */}
        <View style={styles.fieldGroup}>
          <TouchableOpacity
            style={styles.notesToggle}
            onPress={() => setForm(f => ({ ...f, notesExpanded: !f.notesExpanded }))}
          >
            <Text style={styles.label}>Notes {form.notesExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          {form.notesExpanded && (
            <TextInput
              style={styles.notesInput}
              value={form.notes}
              onChangeText={setNotes}
              multiline
              maxLength={500}
              placeholder="e.g. felt dizzy, ate a big meal..."
              accessibilityLabel="Notes"
            />
          )}
          {form.notes.length > 0 && (
            <Text style={styles.charCount}>{form.notes.length}/500</Text>
          )}
        </View>

        {/* ── Save Button ──────────────────────── */}
        <TouchableOpacity
          style={[styles.saveButton, !isValidNumber && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!isValidNumber}
          accessibilityLabel="Save reading"
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>Save Reading</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#212121', marginBottom: 24 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#212121', marginBottom: 8 },
  valueRow: { flexDirection: 'row', gap: 8 },
  valueInput: {
    flex: 1,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 14,
    fontSize: 18,
  },
  inputError: { borderColor: '#D32F2F' },
  errorText: { color: '#D32F2F', fontSize: 12, marginTop: 4 },
  unitToggle: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    justifyContent: 'center',
  },
  unitToggleText: { fontSize: 16, color: '#212121', fontWeight: '600' },
  secondaryValue: { fontSize: 13, color: '#757575', marginTop: 4 },
  dateTimeRow: { flexDirection: 'row', gap: 8 },
  dateButton: {
    flex: 1, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 14,
  },
  dateButtonText: { fontSize: 16, color: '#212121' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20,
  },
  chipActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  chipText: { fontSize: 14, color: '#757575' },
  chipTextActive: { color: '#2196F3', fontWeight: '600' },
  notesToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notesInput: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 80, textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, color: '#757575', textAlign: 'right', marginTop: 4 },
  saveButton: {
    backgroundColor: '#2196F3', paddingVertical: 16,
    borderRadius: 8, alignItems: 'center', marginTop: 8,
  },
  saveButtonDisabled: { backgroundColor: '#BDBDBD' },
  saveButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});
```

### 2. Install DateTimePicker

```bash
npm install @react-native-community/datetimepicker
```

### 3. Verify WatermelonDB Decorators Work

Make sure `babel.config.js` has the decorators plugin (done in US-FE-01).

---

## Behavior Summary

| Field | Default | Behavior |
|---|---|---|
| Value | empty | Numeric keyboard; converts to mg/dL on save |
| Unit toggle | `preferredUnit` from store | Switches between mg/dL and mmol/L |
| Date & Time | now | DateTimePicker, defaults to now |
| Meal Type | Breakfast | Chip selector |
| Before/After | Before | Chip selector |
| Hours After | 2h | Shown only when After selected |
| Notes | collapsed | Expands on tap; max 500 chars with counter |

**Validation:**
- Value must be a number (warn-only for out of range: 20–600 mg/dL)
- Out-of-range → Alert.confirm before save

**On Save:**
- Converts to mg/dL, validates, writes to WatermelonDB with `syncStatus: 'pending'`
- Resets form (value cleared, time = now)
- Shows success `Alert.alert`

---

## Verification

- [ ] Form shows all fields with correct defaults
- [ ] Selecting "After" → hours selector appears
- [ ] Tapping notes → field expands
- [ ] Entering a value and saving → `Alert.alert('Saved', ...)` appears
- [ ] After save → form resets to defaults
- [ ] Out-of-range value (e.g. 5) → warning confirmation dialog
- [ ] Value saved in mg/dL regardless of unit toggle

---

## Dependencies
- **US-FE-08** (repositories) must be complete first.
- **US-FE-05** (Zustand store) must be complete first.
- **US-FE-06** (domain use cases: ValidateReading, ConvertUnit) must be complete first.

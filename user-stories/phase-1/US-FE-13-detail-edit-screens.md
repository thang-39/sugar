# US-FE-13 — Detail & Edit Screens

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 24: Tap a reading to view full details (view-only detail screen)
- US 6: Edit a reading (separate edit screen)
- US 7: Delete a reading

## Goal
Build the read-only **ReadingDetailScreen** and the **EditReadingScreen** (pre-populated form, same layout as the Log screen). Delete is triggered from the detail screen.

---

## Steps

### 1. Reading Detail Screen

**`src/ui/screens/ReadingDetailScreen.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Platform,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { readingRepository } from '../../data/repositories/ReadingRepository';
import { usePreferredUnit } from '../../data/stores/useAppStore';
import { Reading } from '../../domain/models/Reading';
import { toDisplayValue } from '../../utils/unitConversion';
import { formatDateTime } from '../../utils/dateUtils';

type RouteParams = { ReadingDetail: { readingId: string } };

export default function ReadingDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, 'ReadingDetail'>>();
  const navigation = useNavigation<any>();
  const unit = usePreferredUnit();
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(() => {
    const load = async () => {
      // Fetch from repository by finding in all readings
      const all = await readingRepository.getAll();
      const found = all.find(r => r.id === route.params.readingId);
      setReading(found ?? null);
    };
    load();
  }, [route.params.readingId]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Reading',
      'Are you sure you want to delete this reading? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await readingRepository.delete(route.params.readingId);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete reading.');
            }
          },
        },
      ]
    );
  };

  if (!reading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const displayValue = toDisplayValue(reading.value, unit);
  const timing = reading.mealTiming === 'After'
    ? `${reading.mealTiming}${reading.hoursAfterMeal != null ? ` · ${reading.hoursAfterMeal} hour${reading.hoursAfterMeal !== 1 ? 's' : ''} after` : ''}`
    : reading.mealTiming;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Value */}
        <View style={styles.valueBlock}>
          <Text style={styles.valueText}>{displayValue}</Text>
          <Text style={styles.unitText}>{unit}</Text>
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <DetailRow label="Date & Time" value={formatDateTime(reading.recordedAt)} />
          <DetailRow label="Meal" value={reading.mealType} />
          <DetailRow label="Timing" value={timing} />
          {reading.notes && (
            <DetailRow label="Notes" value={reading.notes} />
          )}
          <DetailRow label="Sync Status" value={reading.syncStatus} />
          <DetailRow
            label="Recorded"
            value={`${formatDateTime(reading.createdAt)}${reading.updatedAt !== reading.createdAt ? ` (edited ${formatDateTime(reading.updatedAt)})` : ''}`}
          />
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditReading', { readingId: reading.id })}
          accessibilityLabel="Edit this reading"
          accessibilityRole="button"
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityLabel="Delete this reading"
          accessibilityRole="button"
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  loading: { textAlign: 'center', marginTop: 40, color: '#757575' },
  valueBlock: { alignItems: 'center', paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', marginBottom: 24 },
  valueText: { fontSize: 56, fontWeight: '700', color: '#212121' },
  unitText: { fontSize: 20, color: '#757575', marginTop: 4 },
  section: { gap: 0 },
  detailRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  detailLabel: { width: 120, fontSize: 14, color: '#757575' },
  detailValue: { flex: 1, fontSize: 14, color: '#212121' },
  actionBar: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  editButton: { flex: 1, backgroundColor: '#2196F3', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  editButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  deleteButton: { flex: 1, backgroundColor: '#FFEBEE', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { color: '#D32F2F', fontSize: 16, fontWeight: '600' },
});
```

### 2. Edit Reading Screen

**`src/ui/screens/EditReadingScreen.tsx`**

This is identical to `LogReadingScreen` but:
- Accepts `readingId` from route params
- Pre-populates all form fields from the existing reading
- Converts stored mg/dL value → user's preferred unit for display
- On save → calls `readingRepository.update()` instead of `create()`
- `recordedAt` is editable

```tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, SafeAreaView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { readingRepository } from '../../data/repositories/ReadingRepository';
import { useAppStore, usePreferredUnit } from '../../data/stores/useAppStore';
import { validateReading } from '../../domain/useCases/ValidateReading';
import { fromDisplayValue, toDisplayValue } from '../../utils/unitConversion';
import { formatDateTime } from '../../utils/dateUtils';
import { MealType, MealTiming } from '../../domain/models/Reading';

const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_TIMINGS: MealTiming[] = ['Before', 'After'];
const HOURS_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

type RouteParams = { EditReading: { readingId: string } };

export default function EditReadingScreen() {
  const route = useRoute<RouteProp<RouteParams, 'EditReading'>>();
  const navigation = useNavigation<any>();
  const preferredUnit = usePreferredUnit();
  const userId = useAppStore(s => s.userId);

  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState('');
  const [recordedAt, setRecordedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [mealType, setMealType] = useState<MealType>('Breakfast');
  const [mealTiming, setMealTiming] = useState<MealTiming>('Before');
  const [hoursAfterMeal, setHoursAfterMeal] = useState(2);
  const [notes, setNotes] = useState('');
  const [notesExpanded, setNotesExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const all = await readingRepository.getAll();
      const r = all.find(x => x.id === route.params.readingId);
      if (!r) { Alert.alert('Error', 'Reading not found.'); navigation.goBack(); return; }
      setValue(String(toDisplayValue(r.value, preferredUnit)));
      setRecordedAt(new Date(r.recordedAt));
      setMealType(r.mealType);
      setMealTiming(r.mealTiming);
      setHoursAfterMeal(r.hoursAfterMeal ?? 2);
      setNotes(r.notes ?? '');
      setNotesExpanded(!!r.notes);
      setLoading(false);
    };
    load();
  }, [route.params.readingId]);

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) { Alert.alert('Error', 'Enter a valid number.'); return; }
    const mgdl = fromDisplayValue(numValue, preferredUnit);
    const result = validateReading(mgdl, mealTiming);
    if (!result.valid) { Alert.alert('Error', result.warning!); return; }
    if (result.warning) {
      Alert.alert('Warning', result.warning, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => doSave(mgdl) },
      ]);
      return;
    }
    await doSave(mgdl);
  };

  const doSave = async (mgdl: number) => {
    try {
      await readingRepository.update(route.params.readingId, {
        value: mgdl,
        mealType,
        mealTiming,
        hoursAfterMeal: mealTiming === 'After' ? hoursAfterMeal : null,
        notes: notes || null,
        recordedAt: recordedAt.getTime(),
      });
      Alert.alert('Saved', 'Reading updated.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to update reading.');
    }
  };

  const setRecordedAtHandler = (_: any, date?: Date) => {
    if (Platform.OS === 'android') { setShowDatePicker(false); setShowTimePicker(false); }
    if (date) setRecordedAt(date);
  };

  if (loading) return <SafeAreaView style={styles.container}><Text style={styles.loading}>Loading...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Edit Reading</Text>

        {/* Value */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Blood Sugar ({preferredUnit})</Text>
          <TextInput
            style={styles.valueInput}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            accessibilityLabel="Blood sugar value"
          />
        </View>

        {/* Date & Time */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date & Time</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => { setShowDatePicker(true); setShowTimePicker(false); }}>
            <Text style={styles.dateButtonText}>{formatDateTime(recordedAt.getTime())}</Text>
          </TouchableOpacity>
          {form.showDatePicker && (
            <DateTimePicker value={recordedAt} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={setRecordedAtHandler} />
          )}
        </View>

        {/* Meal Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Meal</Text>
          <View style={styles.chipRow}>
            {MEAL_TYPES.map(type => (
              <TouchableOpacity key={type} style={[styles.chip, mealType === type && styles.chipActive]}
                onPress={() => setMealType(type)}>
                <Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Timing */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Timing</Text>
          <View style={styles.chipRow}>
            {MEAL_TIMINGS.map(timing => (
              <TouchableOpacity key={timing} style={[styles.chip, mealTiming === timing && styles.chipActive]}
                onPress={() => setMealTiming(timing)}>
                <Text style={[styles.chipText, mealTiming === timing && styles.chipTextActive]}>{timing}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hours After */}
        {mealTiming === 'After' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Hours After Meal</Text>
            <View style={styles.chipRow}>
              {HOURS_OPTIONS.map(h => (
                <TouchableOpacity key={h} style={[styles.chip, hoursAfterMeal === h && styles.chipActive]}
                  onPress={() => setHoursAfterMeal(h)}>
                  <Text style={[styles.chipText, hoursAfterMeal === h && styles.chipTextActive]}>{h}h</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <TouchableOpacity onPress={() => setNotesExpanded(!notesExpanded)}>
            <Text style={styles.label}>Notes {notesExpanded ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          {notesExpanded && (
            <TextInput style={styles.notesInput} value={notes} onChangeText={t => setNotes(t.slice(0, 500))} multiline maxLength={500} accessibilityLabel="Notes" />
          )}
          <Text style={styles.charCount}>{notes.length}/500</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} accessibilityLabel="Save changes" accessibilityRole="button">
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16 },
  loading: { textAlign: 'center', marginTop: 40, color: '#757575' },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#212121', marginBottom: 24 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#212121', marginBottom: 8 },
  valueInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14, fontSize: 18 },
  dateButton: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14 },
  dateButtonText: { fontSize: 16, color: '#212121' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 20 },
  chipActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  chipText: { fontSize: 14, color: '#757575' },
  chipTextActive: { color: '#2196F3', fontWeight: '600' },
  notesInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#757575', textAlign: 'right', marginTop: 4 },
  saveButton: { backgroundColor: '#2196F3', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});
```

### 3. Update Navigation

Ensure both screens are registered in `AppNavigator.tsx` (already done in US-FE-10).

---

## Verification

- [ ] Tapping a reading in History list → detail screen shows all fields
- [ ] "Edit" button → edit screen with pre-populated form
- [ ] Editing and saving → `updatedAt` timestamp is bumped
- [ ] "Delete" → confirmation → reading removed from list
- [ ] Navigating back → history list refreshes (deleted item gone)

---

## Dependencies
- **US-FE-11** (LogReadingScreen — this reuses the form layout) must be complete first.
- **US-FE-12** (History list) must be complete first.

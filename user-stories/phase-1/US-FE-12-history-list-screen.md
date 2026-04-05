# US-FE-12 — History List Screen

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 21: See a chronological list of all readings
- US 22: Each item shows date, time, value, meal context
- US 23: Filter by date range
- US 25: Sorted newest-first by default
- US 26: Show reading count for current filter
- US 24: Tap to view details
- US 7: Delete a reading

## Goal
Build the History List screen with a FlatList of readings, date range filter, reading count, and navigation to the detail screen.

---

## Steps

### 1. Create History List Screen

**`src/ui/screens/HistoryListScreen.tsx`**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { readingRepository } from '../../data/repositories/ReadingRepository';
import { useAppStore } from '../../data/stores/useAppStore';
import { Reading } from '../../domain/models/Reading';
import { toDisplayValue } from '../../utils/unitConversion';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { usePreferredUnit } from '../../data/stores/useAppStore';

type DateFilter = { start: number; end: number } | null;

// ──────────────────────────────────────────────
// Chip component
// ──────────────────────────────────────────────
function MealChip({ reading }: { reading: Reading }) {
  const timing = reading.mealTiming === 'After'
    ? ` · ${reading.mealTiming}${reading.hoursAfterMeal != null ? ` · ${reading.hoursAfterMeal}h` : ''}`
    : ' · Before';
  return <Text style={styles.mealChip}>{reading.mealType}{timing}</Text>;
}

// ──────────────────────────────────────────────
// List item
// ──────────────────────────────────────────────
function ReadingItem({
  reading,
  unit,
  onPress,
}: {
  reading: Reading;
  unit: 'mg/dL' | 'mmol/L';
  onPress: () => void;
}) {
  const displayValue = toDisplayValue(reading.value, unit);

  return (
    <TouchableOpacity
      style={styles.readingItem}
      onPress={onPress}
      accessibilityLabel={`Reading: ${displayValue} ${unit} at ${formatDate(reading.recordedAt)}`}
      accessibilityRole="button"
    >
      <View style={styles.readingItemLeft}>
        <Text style={styles.readingValue}>{displayValue}</Text>
        <Text style={styles.readingUnit}>{unit}</Text>
      </View>
      <View style={styles.readingItemRight}>
        <Text style={styles.readingDateTime}>
          {formatDate(reading.recordedAt)} · {formatTime(reading.recordedAt)}
        </Text>
        <MealChip reading={reading} />
        {reading.notes && (
          <Text style={styles.readingNotes} numberOfLines={1}>
            {reading.notes}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No readings yet</Text>
      <Text style={styles.emptySubtitle}>Start logging your blood sugar to see your history here.</Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// Screen
// ──────────────────────────────────────────────
export default function HistoryListScreen() {
  const unit = usePreferredUnit();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [filter, setFilter] = useState<DateFilter>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d;
  });
  const [toDate, setToDate] = useState<Date>(() => new Date());

  const loadReadings = useCallback(async () => {
    let result: Reading[];
    if (filter) {
      result = await readingRepository.getByDateRange(filter.start, filter.end);
    } else {
      result = await readingRepository.getAll();
    }
    setReadings(result);
    const all = await readingRepository.getAll();
    setTotalCount(all.length);
  }, [filter]);

  useEffect(() => { loadReadings(); }, [loadReadings]);

  const handleDateChange = (type: 'from' | 'to') => (_: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowFromPicker(false);
      setShowToPicker(false);
    }
    if (!date) return;
    if (type === 'from') {
      setFromDate(date);
      setShowFromPicker(false);
    } else {
      setToDate(date);
      setShowToPicker(false);
      // Apply filter
      setFilter({ start: fromDate.getTime(), end: date.getTime() });
    }
  };

  const clearFilter = () => {
    setFilter(null);
    setShowFromPicker(false);
    setShowToPicker(false);
  };

  const countLabel = filter ? `${readings.length} of ${totalCount}` : `${totalCount}`;
  const filterLabel = filter
    ? `Filtered: ${formatDate(filter.start)} – ${formatDate(filter.end)}`
    : 'All readings';

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ───────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>History</Text>
        <Text style={styles.readingCount}>{countLabel} readings</Text>
      </View>

      {/* ── Date Filter ──────────────────── */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFromPicker(true)}
          accessibilityLabel="Select start date"
        >
          <Text style={styles.filterButtonText}>From: {formatDate(fromDate.getTime())}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowToPicker(true)}
          accessibilityLabel="Select end date"
        >
          <Text style={styles.filterButtonText}>To: {formatDate(toDate.getTime())}</Text>
        </TouchableOpacity>
        {filter && (
          <TouchableOpacity style={styles.clearFilterButton} onPress={clearFilter}>
            <Text style={styles.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {showFromPicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          maximumDate={toDate}
          onChange={handleDateChange('from')}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          minimumDate={fromDate}
          onChange={handleDateChange('to')}
        />
      )}

      {/* ── List ────────────────────────── */}
      <FlatList
        data={readings}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ReadingItem
            reading={item}
            unit={unit}
            onPress={() => {
              // Navigate to detail — handled by navigation prop
              // @ts-ignore
              props.navigation.navigate('ReadingDetail', { readingId: item.id });
            }}
          />
        )}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={readings.length === 0 ? styles.emptyContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#212121' },
  readingCount: { fontSize: 14, color: '#757575' },
  filterBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  filterButton: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#FFFFFF',
  },
  filterButtonText: { fontSize: 13, color: '#212121' },
  clearFilterButton: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 8, justifyContent: 'center',
  },
  clearFilterText: { fontSize: 13, color: '#D32F2F' },
  readingItem: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  readingItemLeft: { width: 80, alignItems: 'center', justifyContent: 'center' },
  readingValue: { fontSize: 22, fontWeight: '700', color: '#212121' },
  readingUnit: { fontSize: 12, color: '#757575' },
  readingItemRight: { flex: 1, paddingLeft: 12 },
  readingDateTime: { fontSize: 14, color: '#212121', marginBottom: 4 },
  mealChip: { fontSize: 12, color: '#2196F3', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 4 },
  readingNotes: { fontSize: 13, color: '#757575', fontStyle: 'italic', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#F0F0F0' },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#212121', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#757575', textAlign: 'center', lineHeight: 22 },
});
```

### 2. Update Navigation

In `AppNavigator.tsx` `HistoryStack`, pass `navigation` prop:
```tsx
<createNativeStackNavigator.Screen
  name="HistoryList"
  component={HistoryListScreen}
  options={{ title: 'History' }}
/>
```

### 3. Handle Delete (from History or Detail)

Add a delete handler to the item or add a swipe-to-delete. A simple approach: long-press on a row shows an Alert.confirm to delete.

---

## Behavior Summary

| Feature | Behavior |
|---|---|
| List | FlatList, newest first (`recordedAt` DESC) |
| Date filter | From/To date pickers; apply on "To" date selection |
| Clear filter | Shows all readings |
| Count | "N of M readings" when filtered |
| Empty state | "No readings yet. Start logging!" |
| Tap row | Navigate to `ReadingDetailScreen` with `readingId` param |

---

## Verification

- [ ] After logging a reading → it appears in History list
- [ ] List is sorted newest first
- [ ] Each row shows value, unit, date, time, meal chip
- [ ] Date range filter updates the list
- [ ] Clear filter resets to all readings
- [ ] Count updates when filtered
- [ ] Tapping a row navigates to detail screen
- [ ] Empty state shown when no readings

---

## Dependencies
- **US-FE-11** (can log readings) must be complete so there's data to display.
- **US-FE-08** (repositories) must be complete.

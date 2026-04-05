# US-FE-15 — Settings Screen

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 43: Choose preferred blood sugar unit (mg/dL ↔ mmol/L)
- US 46: See app version and basic info (About screen)
- US 37, 39, 41: Export Data (Phase 6 placeholder)
- US 12–14: Account (Phase 5 placeholder)

## Goal
Build the Settings screen with unit toggle and placeholder navigation to Account, Export, and About screens. About screen shows version and medical disclaimer.

---

## Steps

### 1. Create Settings Screen

**`src/ui/screens/SettingsScreen.tsx`**

```tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore, usePreferredUnit } from '../../data/stores/useAppStore';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const unit = usePreferredUnit();
  const setPreferredUnit = useAppStore(s => s.setPreferredUnit);

  const toggleUnit = () => {
    setPreferredUnit(unit === 'mg/dL' ? 'mmol/L' : 'mg/dL');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Unit preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Blood Sugar Unit</Text>
              <Text style={styles.rowHint}>Changes how values are shown throughout the app</Text>
            </View>
            <TouchableOpacity
              style={styles.unitSelector}
              onPress={toggleUnit}
              accessibilityLabel={`Current unit: ${unit}. Tap to change.`}
              accessibilityRole="button"
            >
              <Text style={styles.unitSelectorText}>{unit}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('SettingsMain', { screen: 'ExportData' })}
            accessibilityLabel="Export Data"
            accessibilityRole="button"
          >
            <Text style={styles.navRowLabel}>Export Data</Text>
            <Text style={styles.navRowArrow}>›</Text>
          </TouchableOpacity>
          <Text style={styles.navRowHint}>Export your readings to CSV</Text>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('SettingsMain', { screen: 'Account' })}
            accessibilityLabel="Account"
            accessibilityRole="button"
          >
            <Text style={styles.navRowLabel}>Account</Text>
            <Text style={styles.navRowArrow}>›</Text>
          </TouchableOpacity>
          <Text style={styles.navRowHint}>Sign in, create account, or delete account</Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => navigation.navigate('SettingsMain', { screen: 'About' })}
            accessibilityLabel="About"
            accessibilityRole="button"
          >
            <Text style={styles.navRowLabel}>About</Text>
            <Text style={styles.navRowArrow}>›</Text>
          </TouchableOpacity>
          <Text style={styles.navRowHint}>App version and medical disclaimer</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F5F5', padding: 16, borderRadius: 8 },
  rowLabel: { fontSize: 16, color: '#212121', marginBottom: 2 },
  rowHint: { fontSize: 13, color: '#757575', maxWidth: '70%' },
  unitSelector: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#2196F3', borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  unitSelectorText: { fontSize: 16, fontWeight: '600', color: '#2196F3' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  navRowLabel: { fontSize: 16, color: '#212121' },
  navRowHint: { fontSize: 13, color: '#757575', marginTop: -4, marginBottom: 8 },
  navRowArrow: { fontSize: 20, color: '#BDBDBD' },
});
```

### 2. Create About Screen

**`src/ui/screens/AboutScreen.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Linking } from 'react-native';
import Constants from 'expo-constants'; // or manual version

// Manual version (no expo):
const APP_VERSION = '1.0.0'; // Update this on each release

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.appName}>Blood Sugar Tracker</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>Medical Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This app is for personal wellness tracking purposes only. It is not a medical device and has not been evaluated by any regulatory authority. It is not intended to diagnose, treat, cure, or prevent any disease or medical condition.
          </Text>
          <Text style={styles.disclaimerText}>
            Always consult your healthcare provider before making any medical decisions. Do not rely on this app for medical advice.
          </Text>
        </View>

        <Text style={styles.footer}>
          Built with React Native + WatermelonDB + Supabase
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24 },
  appName: { fontSize: 28, fontWeight: 'bold', color: '#212121', textAlign: 'center', marginBottom: 4 },
  version: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 32 },
  disclaimerBox: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  disclaimerTitle: { fontSize: 16, fontWeight: '600', color: '#795548', marginBottom: 8 },
  disclaimerText: { fontSize: 14, color: '#795548', lineHeight: 22, marginBottom: 8 },
  footer: { fontSize: 13, color: '#BDBDBD', textAlign: 'center' },
});
```

### 3. Create Placeholder Screens

**`src/ui/screens/ExportScreen.tsx`** (Phase 6):
```tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
export default function ExportScreen() {
  return <SafeAreaView style={styles.c}><View style={styles.content}><Text style={styles.title}>Export Data</Text><Text style={styles.placeholder}>Export functionality coming in Phase 6.</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ c: { flex: 1, backgroundColor: '#FFF' }, content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }, title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 }, placeholder: { fontSize: 14, color: '#757575' } });
```

**`src/ui/screens/AccountScreen.tsx`** (Phase 5):
```tsx
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
export default function AccountScreen() {
  return <SafeAreaView style={styles.c}><View style={styles.content}><Text style={styles.title}>Account</Text><Text style={styles.placeholder}>Account management coming in Phase 5.</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ c: { flex: 1, backgroundColor: '#FFF' }, content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' }, title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 }, placeholder: { fontSize: 14, color: '#757575' } });
```

### 4. Update SettingsStack in AppNavigator

```tsx
function SettingsStack() {
  return (
    <createNativeStackNavigator.Navigator>
      <createNativeStackNavigator.Screen name="SettingsMain" component={SettingsScreen} options={{ title: 'Settings' }} />
      <createNativeStackNavigator.Screen name="ExportData" component={ExportScreen} options={{ title: 'Export Data' }} />
      <createNativeStackNavigator.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <createNativeStackNavigator.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </createNativeStackNavigator.Navigator>
  );
}
```

---

## Verification

- [ ] Settings screen accessible from bottom tab
- [ ] Tapping unit selector toggles between mg/dL and mmol/L
- [ ] Unit change persists across app restarts
- [ ] Navigating to About → shows version and disclaimer
- [ ] Navigating to Export → placeholder shown
- [ ] Navigating to Account → placeholder shown

---

## Dependencies
- **US-FE-10** (navigation setup) must be complete first.

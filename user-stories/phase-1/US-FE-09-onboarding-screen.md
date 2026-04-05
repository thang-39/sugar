# US-FE-09 — Onboarding Screen

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 47: Brief onboarding flow (1 screen: purpose + unit preference + disclaimer)
- US 48: Skip onboarding and go straight to guest mode

## Goal
Implement the single onboarding screen shown on first launch. It collects the user's unit preference and shows the medical disclaimer.

---

## Steps

### 1. Create Onboarding Screen

**`src/ui/screens/OnboardingScreen.tsx`**

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useAppStore, PreferredUnit } from '../../data/stores/useAppStore';

const UNITS: PreferredUnit[] = ['mg/dL', 'mmol/L'];

function OnboardingScreen() {
  const [selectedUnit, setSelectedUnit] = useState<PreferredUnit>('mg/dL');
  const { setPreferredUnit, completeOnboarding } = useAppStore();

  const handleGetStarted = () => {
    setPreferredUnit(selectedUnit);
    completeOnboarding();
  };

  const handleSkip = () => {
    // Skip → guest mode, unit defaults to mg/dL
    setPreferredUnit('mg/dL');
    completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* App tagline */}
        <Text style={styles.tagline}>
          Your personal blood sugar tracker
        </Text>
        <Text style={styles.subtitle}>
          Log your readings, track trends, and share with your doctor — all from your phone.
        </Text>

        {/* Unit preference */}
        <Text style={styles.label}>Preferred unit</Text>
        <View style={styles.unitToggle}>
          {UNITS.map(unit => (
            <TouchableOpacity
              key={unit}
              style={[
                styles.unitButton,
                selectedUnit === unit && styles.unitButtonActive,
              ]}
              onPress={() => setSelectedUnit(unit)}
              accessibilityLabel={`Select ${unit}`}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.unitButtonText,
                  selectedUnit === unit && styles.unitButtonTextActive,
                ]}
              >
                {unit}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            This app is for personal wellness tracking only. It is not a medical device and is not intended to diagnose, treat, cure, or prevent any disease.
          </Text>
        </View>

        {/* Get Started button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGetStarted}
          accessibilityLabel="Get started"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Skip link */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          accessibilityLabel="Skip and use guest mode"
          accessibilityRole="button"
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default OnboardingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  tagline: { fontSize: 28, fontWeight: 'bold', color: '#212121', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#757575', textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#212121', marginBottom: 12 },
  unitToggle: { flexDirection: 'row', marginBottom: 40, gap: 12 },
  unitButton: {
    flex: 1, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    alignItems: 'center',
  },
  unitButtonActive: { borderColor: '#2196F3', backgroundColor: '#E3F2FD' },
  unitButtonText: { fontSize: 16, color: '#757575' },
  unitButtonTextActive: { color: '#2196F3', fontWeight: '600' },
  disclaimerBox: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    marginBottom: 32,
  },
  disclaimerText: { fontSize: 13, color: '#795548', fontStyle: 'italic', lineHeight: 20 },
  primaryButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  skipButton: { alignItems: 'center', paddingVertical: 12 },
  skipButtonText: { fontSize: 14, color: '#757575' },
});
```

### 2. Update `AppNavigator.tsx`

Make onboarding the first screen shown when `onboardingCompleted === false`:

```tsx
// src/ui/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAppStore } from '../../data/stores/useAppStore';

import OnboardingScreen from '../screens/OnboardingScreen';
import LogReadingScreen from '../screens/LogReadingScreen';
import HistoryListScreen from '../screens/HistoryListScreen';
import TrendsScreen from '../screens/TrendsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Log"      component={LogReadingScreen} />
      <Tab.Screen name="History"  component={HistoryListScreen} />
      <Tab.Screen name="Trends"   component={TrendsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const onboardingCompleted = useAppStore(s => s.onboardingCompleted);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingCompleted ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 3. Wire into App Entry Point

**`App.tsx`** (or `index.js`):

```tsx
import React from 'react';
import AppNavigator from './src/ui/navigation/AppNavigator';

export default function App() {
  return <AppNavigator />;
}
```

---

## Behavior Summary

| Action | Effect |
|---|---|
| "Get Started" tap | Saves unit preference, marks onboarding complete, navigates to Main tabs |
| "Skip" tap | Saves default unit (mg/dL), marks onboarding complete, navigates to Main tabs |
| Second app launch | Onboarding never shown again (state persisted in Zustand/AsyncStorage) |

---

## Verification

- [ ] Fresh app launch → OnboardingScreen is shown
- [ ] Selecting "mmol/L" → "Get Started" → unit saved as `mmol/L`
- [ ] Tapping "Skip" → navigates to Main tabs without showing unit picker
- [ ] Kill app and relaunch → OnboardingScreen is NOT shown (persisted)
- [ ] Unit preference persists across restarts

---

## Dependencies
- **US-FE-05** (Zustand store with `onboardingCompleted`) must be complete first.
- **US-FE-02** (screen shells exist) must be complete first.

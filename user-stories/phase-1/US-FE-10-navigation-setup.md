# US-FE-10 — Navigation Setup

## Parent Phase
Phase 1 — Scaffold + Core Logging (Guest Mode)

## Backend / Frontend
**Frontend**

## User Story (from PRD)
- US 30: History and Trends both accessible from main screen

## Goal
Set up the full React Navigation structure: bottom tabs with per-tab stack navigators. US-FE-09 already wired `Onboarding` vs `Main` — this task extends the Main navigator with per-tab stacks ready for detail/edit screens.

---

## Steps

### 1. Update AppNavigator with Per-Tab Stacks

**`src/ui/navigation/AppNavigator.tsx`**

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAppStore } from '../../data/stores/useAppStore';

import OnboardingScreen from '../screens/OnboardingScreen';
import LogReadingScreen from '../screens/LogReadingScreen';
import HistoryListScreen from '../screens/HistoryListScreen';
import ReadingDetailScreen from '../screens/ReadingDetailScreen';
import EditReadingScreen from '../screens/EditReadingScreen';
import TrendsScreen from '../screens/TrendsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ──────────────────────────────────────────────
// Per-tab stacks
// ──────────────────────────────────────────────
function LogStack() {
  return (
    <createNativeStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <createNativeStackNavigator.Screen name="LogMain" component={LogReadingScreen} />
    </createNativeStackNavigator.Navigator>
  );
}

function HistoryStack() {
  return (
    <createNativeStackNavigator.Navigator>
      <createNativeStackNavigator.Screen
        name="HistoryList"
        component={HistoryListScreen}
        options={{ title: 'History' }}
      />
      <createNativeStackNavigator.Screen
        name="ReadingDetail"
        component={ReadingDetailScreen}
        options={{ title: 'Reading' }}
      />
      <createNativeStackNavigator.Screen
        name="EditReading"
        component={EditReadingScreen}
        options={{ title: 'Edit Reading' }}
      />
    </createNativeStackNavigator.Navigator>
  );
}

function TrendsStack() {
  return (
    <createNativeStackNavigator.Navigator>
      <createNativeStackNavigator.Screen
        name="TrendsMain"
        component={TrendsScreen}
        options={{ title: 'Trends' }}
      />
    </createNativeStackNavigator.Navigator>
  );
}

function SettingsStack() {
  return (
    <createNativeStackNavigator.Navigator>
      <createNativeStackNavigator.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </createNativeStackNavigator.Navigator>
  );
}

// ──────────────────────────────────────────────
// Main tabs
// ──────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = { Log: '📝', History: '📋', Trends: '📈', Settings: '⚙️' };
          return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Log"      component={LogStack} />
      <Tab.Screen name="History"  component={HistoryStack} />
      <Tab.Screen name="Trends"   component={TrendsStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}

// ──────────────────────────────────────────────
// Root navigator
// ──────────────────────────────────────────────
export default function AppNavigator() {
  const onboardingCompleted = useAppStore(s => s.onboardingCompleted);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingCompleted ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
```

> **Note:** `createNativeStackNavigator` is called once and the result is used for all tab stacks. Import once at the top and reuse.

### 2. Navigation Types

Create **`src/ui/navigation/types.ts`** for type-safe navigation:

```ts
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

export type HistoryStackParamList = {
  HistoryList: undefined;
  ReadingDetail: { readingId: string };
  EditReading: { readingId: string };
};

export type NavigationProp<T> = NativeStackNavigationProp<T>;
```

Update each screen to import and use these types for `navigation.navigate()` calls.

---

## Navigation Structure

```
Root Stack Navigator
├── OnboardingScreen               (when !onboardingCompleted)
└── Main (Bottom Tab Navigator)
    ├── Log Stack
    │   └── LogReadingScreen
    ├── History Stack
    │   ├── HistoryListScreen
    │   ├── ReadingDetailScreen
    │   └── EditReadingScreen
    ├── Trends Stack
    │   └── TrendsScreen
    └── Settings Stack
        └── SettingsScreen
```

---

## Verification

- [ ] App shows bottom tab bar with 4 tabs: Log, History, Trends, Settings
- [ ] Tab icons are visible
- [ ] Tapping History tab → navigates to HistoryListScreen
- [ ] "Edit" from detail screen → navigates to EditReadingScreen (via stack)
- [ ] "Get Started" on onboarding → navigates to Main (Log tab is visible)

---

## Dependencies
- **US-FE-09** (onboarding) must be complete first (this task extends it).

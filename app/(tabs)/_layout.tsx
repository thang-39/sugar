import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '@/ui/hooks/use-settings';
import { fontSize, fontFamily, useTheme } from '@/ui/theme';

export default function TabsLayout(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const onboardingDone = useSettingsStore((s) => s.onboardingDone);

  // First-run gate. TabsLayout renders inside the root navigator, so navigation
  // hooks are safe here (unlike the root _layout). Fires on first launch and
  // again after delete-all resets `onboardingDone` to false.
  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSize.xs, fontFamily: fontFamily.bold },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: fontSize.lg, fontFamily: fontFamily.extrabold },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.log'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: t('tabs.trends'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

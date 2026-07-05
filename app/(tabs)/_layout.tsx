import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { colors, fontSize, fontFamily } from '@/ui/theme';

export default function TabsLayout(): ReactElement {
  const { t } = useTranslation();

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

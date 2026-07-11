import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { colors, fontSize, fontFamily } from '@/ui/theme';

export default function SettingsStackLayout(): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: fontSize.lg, fontFamily: fontFamily.extrabold },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('tabs.settings') }} />
      <Stack.Screen name="target-range" options={{ title: t('screens.settings.targetRange.title') }} />
      <Stack.Screen name="tracking-mode" options={{ title: t('screens.settings.trackingMode.title') }} />
      <Stack.Screen name="export" options={{ title: t('screens.settings.export.title') }} />
      <Stack.Screen name="about" options={{ title: t('screens.settings.about.title') }} />
    </Stack>
  );
}

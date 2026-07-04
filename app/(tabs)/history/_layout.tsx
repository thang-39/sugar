import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { colors, fontSize, fontWeight } from '@/ui/theme';

export default function HistoryStackLayout(): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('tabs.history') }} />
      <Stack.Screen name="[id]/index" options={{ title: t('screens.readingDetail.title') }} />
      <Stack.Screen name="[id]/edit" options={{ title: t('screens.editReading.title') }} />
    </Stack>
  );
}

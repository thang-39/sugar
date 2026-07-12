import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { colors, fontSize, fontFamily } from '@/ui/theme';

export default function HistoryStackLayout(): ReactElement {
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
      <Stack.Screen name="index" options={{ title: t('tabs.history'), headerShown: false }} />
    </Stack>
  );
}

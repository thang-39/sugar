import { Link, Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, fontWeight, spacing } from '@/ui/theme';

export default function NotFoundScreen(): ReactElement {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: t('screens.notFound.title') }} />
      <View style={styles.container}>
        <Text style={styles.message}>{t('screens.notFound.message')}</Text>
        <Link href="/" style={styles.link}>
          {t('screens.notFound.back')}
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  message: {
    fontSize: fontSize.base,
    color: colors.text,
    textAlign: 'center',
  },
  link: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});

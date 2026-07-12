import { Link, Stack } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { fontSize, fontWeight, spacing, useTheme, type ColorScheme } from '@/ui/theme';

export default function NotFoundScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
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

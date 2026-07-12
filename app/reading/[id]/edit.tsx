import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LogReadingForm } from '@/ui/components/log-reading-form';
import { useReading } from '@/ui/hooks/use-readings';
import { fontSize, spacing, useTheme, type ColorScheme } from '@/ui/theme';

export default function EditReadingScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reading, isLoading } = useReading(id);

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (reading === undefined) {
    return (
      <View style={styles.centerState}>
        <Ionicons name="help-circle-outline" size={48} color={colors.textDisabled} />
        <Text style={styles.notFound}>{t('readingDetail.notFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LogReadingForm initialReading={reading} onSaved={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: spacing.xxl,
      gap: spacing.md,
    },
    notFound: {
      fontSize: fontSize.lg,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

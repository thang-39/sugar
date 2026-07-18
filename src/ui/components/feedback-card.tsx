import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppText } from '@/ui/components/ui';
import { fontSize, radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';

interface FeedbackCardProps {
  onPress: () => void;
}

/**
 * Warm invitation to send feedback, shown on the Report screen after the first
 * export. Surface-tinted (theme-aware) so it reads as friendly, not an error.
 */
export function FeedbackCard({ onPress }: FeedbackCardProps): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Ionicons name="heart" size={24} color={colors.primary} />
        </View>
        <AppText weight="extrabold" style={styles.title}>
          {t('screens.settings.report.feedbackCard.title')}
        </AppText>
      </View>
      <AppText color={colors.textMuted} style={styles.subtitle}>
        {t('screens.settings.report.feedbackCard.subtitle')}
      </AppText>
      <TouchableOpacity
        style={styles.pill}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('screens.settings.report.feedbackCard.cta')}
      >
        <AppText weight="extrabold" color={colors.onDark}>
          {t('screens.settings.report.feedbackCard.cta')}
        </AppText>
        <Ionicons name="arrow-forward" size={16} color={colors.onDark} />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.card,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconTile: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: fontSize.base,
      lineHeight: 22,
    },
    subtitle: {
      fontSize: fontSize.sm,
      lineHeight: 21,
    },
    pill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
  });

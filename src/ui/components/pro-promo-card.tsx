// src/ui/components/pro-promo-card.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppText } from '@/ui/components/ui';
import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';

interface ProPromoCardProps {
  onPress: () => void;
}

/**
 * Amber Sugar Pro upsell shown in Settings when the user is not Pro.
 * The amber accent is mode-independent (constant.amber in both color schemes),
 * so it stays yellow in both Daily (Evergreen) and Gestational (Rose) modes.
 */
export function ProPromoCard({ onPress }: ProPromoCardProps): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('screens.settings.index.rows.pro')}
    >
      <View style={styles.header}>
        <Ionicons name="ribbon" size={22} color={colors.text} />
        <AppText variant="heading" weight="extrabold" color={colors.text}>
          {t('screens.settings.index.rows.pro')}
        </AppText>
      </View>
      <AppText style={styles.tagline} color={colors.text}>
        {t('screens.settings.index.proPromo.tagline')}
      </AppText>
      <View style={styles.pill}>
        <AppText weight="extrabold" color={colors.text}>
          {t('screens.settings.index.proPromo.upgrade')}
        </AppText>
        <Ionicons name="arrow-forward" size={16} color={colors.text} />
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.accentAmber,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    tagline: {
      opacity: 0.9,
    },
    pill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
  });

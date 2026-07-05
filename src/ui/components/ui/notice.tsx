import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/ui/theme';
import { AppText } from './app-text';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type NoticeTone = 'warn' | 'success' | 'info';

interface NoticeProps {
  message: string;
  /** Visual tone (default 'warn'). */
  tone?: NoticeTone;
  /** Optional leading icon. */
  icon?: IconName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const TONE: Record<NoticeTone, { bg: string; fg: string }> = {
  warn: { bg: colors.warnBg, fg: colors.outOfRange },
  success: { bg: colors.inRangeBg, fg: colors.inRange },
  info: { bg: colors.surface, fg: colors.primary },
};

/** Inline block alert box (validation warnings, in-range confirmation). Presentational. */
export function Notice({
  message,
  tone = 'warn',
  icon,
  accessibilityLabel,
  style,
}: NoticeProps): ReactElement {
  const { bg, fg } = TONE[tone];
  return (
    <View
      style={[styles.box, { backgroundColor: bg }, style]}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? message}
    >
      {icon && <Ionicons name={icon} size={18} color={fg} style={styles.icon} />}
      <AppText variant="caption" weight="bold" color={fg} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
  },
});

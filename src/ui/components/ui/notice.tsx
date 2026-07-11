import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentProps, type ReactElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
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

function toneStyles(tone: NoticeTone, colors: ColorScheme): { bg: string; fg: string } {
  switch (tone) {
    case 'success':
      return { bg: colors.inRangeBg, fg: colors.inRange };
    case 'info':
      return { bg: colors.surface, fg: colors.primary };
    default:
      return { bg: colors.warnBg, fg: colors.outOfRange };
  }
}

/** Inline block alert box (validation warnings, in-range confirmation). Presentational. */
export function Notice({
  message,
  tone = 'warn',
  icon,
  accessibilityLabel,
  style,
}: NoticeProps): ReactElement {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { bg, fg } = toneStyles(tone, colors);
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

const makeStyles = (_colors: ColorScheme) =>
  StyleSheet.create({
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

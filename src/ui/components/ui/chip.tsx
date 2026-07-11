import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ComponentProps, type ReactElement } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { AppText } from './app-text';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Fill color when selected (default: primary green). */
  activeColor?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Pill toggle for filters and multi-choice selectors. Presentational. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  activeColor,
  accessibilityLabel,
  style,
}: ChipProps): ReactElement {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fill = activeColor ?? colors.primary;
  const fg = selected ? colors.onPrimary : colors.textMuted;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected ? { backgroundColor: fill, borderColor: fill } : styles.inactive,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={styles.content}>
        {icon && <Ionicons name={icon} size={18} color={fg} style={styles.icon} />}
        <AppText weight={selected ? 'extrabold' : 'bold'} color={fg}>
          {label}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    chip: {
      minHeight: 40,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inactive: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: spacing.xs,
    },
  });

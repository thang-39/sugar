import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactElement } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { AppText } from './app-text';

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  step?: number;
  label?: string;
  /** Render the middle value (e.g. append a unit suffix). */
  formatValue?: (value: number) => string;
  decrementAccessibilityLabel?: string;
  incrementAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** −/＋ numeric stepper with clamped bounds. Presentational. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  step = 1,
  label,
  formatValue,
  decrementAccessibilityLabel,
  incrementAccessibilityLabel,
  style,
}: StepperProps): ReactElement {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={[styles.container, style]}>
      {label && <AppText weight="bold">{label}</AppText>}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, !canDecrement && styles.buttonDisabled]}
          disabled={!canDecrement}
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canDecrement }}
          accessibilityLabel={decrementAccessibilityLabel}
        >
          <Ionicons name="remove" size={24} color={colors.onPrimaryButton} />
        </TouchableOpacity>
        <AppText variant="heading" style={styles.value}>
          {formatValue ? formatValue(value) : String(value)}
        </AppText>
        <TouchableOpacity
          style={[styles.button, !canIncrement && styles.buttonDisabled]}
          disabled={!canIncrement}
          onPress={() => onChange(Math.min(max, value + step))}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canIncrement }}
          accessibilityLabel={incrementAccessibilityLabel}
        >
          <Ionicons name="add" size={24} color={colors.onPrimaryButton} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      minHeight: 56,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    button: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    value: {
      minWidth: 56,
      textAlign: 'center',
    },
  });

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/ui/theme';
import { AppText } from './app-text';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'dangerOutline';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  isLoading?: boolean;
  disabled?: boolean;
  /** UPPERCASE the label (design uses caps for the two solid CTAs). */
  uppercase?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const SOLID: readonly ButtonVariant[] = ['primary', 'accent'];

function backgroundFor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return colors.primaryButton;
    case 'accent':
      return colors.primary;
    default:
      return 'transparent';
  }
}

function foregroundFor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
    case 'accent':
      return colors.onPrimaryButton;
    case 'dangerOutline':
      return colors.error;
    default:
      return colors.primary;
  }
}

/** Full-width pill button. Presentational — logic lives in the caller. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  isLoading = false,
  disabled = false,
  uppercase,
  accessibilityLabel,
  style,
}: ButtonProps): ReactElement {
  const isDisabled = disabled || isLoading;
  const fg = foregroundFor(variant);
  const isSolid = SOLID.includes(variant);
  const caps = uppercase ?? isSolid;

  const containerStyle: ViewStyle = {
    backgroundColor: backgroundFor(variant),
    ...(variant === 'dangerOutline' && { borderWidth: 1.5, borderColor: colors.error }),
  };

  return (
    <TouchableOpacity
      style={[styles.base, containerStyle, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={fg} style={styles.icon} />
        ) : (
          icon && <Ionicons name={icon} size={22} color={fg} style={styles.icon} />
        )}
        <AppText
          variant="body"
          weight="extrabold"
          color={fg}
          style={[styles.label, caps && styles.caps]}
        >
          {caps ? label.toUpperCase() : label}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontSize: fontSize.base,
  },
  caps: {
    letterSpacing: 0.5,
  },
});

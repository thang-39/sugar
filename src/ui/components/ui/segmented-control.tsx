import { useMemo, type ReactElement } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';
import { AppText } from './app-text';

interface Segment<T extends string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Fill color for the active segment (default: primary green). */
  activeColor?: string;
  /** Text color for the active segment (default: onPrimary). Use for light active fills. */
  activeTextColor?: string;
  style?: StyleProp<ViewStyle>;
  segmentStyle?: StyleProp<ViewStyle>;
  activeSegmentStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

/** 2+ segment pill switch (unit toggle, Before/After timing). Presentational. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  activeColor,
  activeTextColor,
  style,
  segmentStyle,
  activeSegmentStyle,
  labelStyle,
}: SegmentedControlProps<T>): ReactElement {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const fill = activeColor ?? colors.primary;
  const activeText = activeTextColor ?? colors.onPrimary;
  return (
    <View style={[styles.track, style]}>
      {segments.map((segment) => {
        const isActive = segment.value === value;
        return (
          <TouchableOpacity
            key={segment.value}
            style={[
              styles.segment,
              segmentStyle,
              isActive && { backgroundColor: fill },
              isActive && activeSegmentStyle,
            ]}
            onPress={() => onChange(segment.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
          >
            <AppText
              weight={isActive ? 'extrabold' : 'bold'}
              color={isActive ? activeText : colors.textMuted}
              style={labelStyle}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {segment.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radius.pill,
      padding: 4,
      // Soft inner-panel shadow (0 2px 10px rgba(27,43,36,.05)).
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 1,
    },
    segment: {
      flex: 1,
      minHeight: 44,
      borderRadius: radius.pill,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
  });

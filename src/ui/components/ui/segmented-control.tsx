import type { ReactElement } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/ui/theme';
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
  style?: StyleProp<ViewStyle>;
}

/** 2+ segment pill switch (unit toggle, Before/After timing). Presentational. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  activeColor = colors.primary,
  style,
}: SegmentedControlProps<T>): ReactElement {
  return (
    <View style={[styles.track, style]}>
      {segments.map((segment) => {
        const isActive = segment.value === value;
        return (
          <TouchableOpacity
            key={segment.value}
            style={[styles.segment, isActive && { backgroundColor: activeColor }]}
            onPress={() => onChange(segment.value)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
          >
            <AppText
              weight={isActive ? 'extrabold' : 'bold'}
              color={isActive ? colors.onPrimary : colors.textMuted}
            >
              {segment.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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

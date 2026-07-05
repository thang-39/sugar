import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppText } from '@/ui/components/ui';
import { colors, spacing } from '@/ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface SettingRowProps {
  icon: IconName;
  iconColor: string;
  label: string;
  /** Muted value shown before the chevron (navigation rows). */
  value?: string;
  /** Interactive control on the right (Toggle / SegmentedControl). Wins over value + chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Suppress the bottom divider (last row in a group). */
  isLast?: boolean;
}

/**
 * One row inside a settings group Card. Icon → label → either a `trailing`
 * control or a muted `value` + chevron (when tappable). Screen composite.
 */
export function SettingRow({
  icon,
  iconColor,
  label,
  value,
  trailing,
  onPress,
  isLast = false,
}: SettingRowProps): ReactElement {
  const body = (
    <View style={[styles.row, !isLast && styles.divider]}>
      <Ionicons name={icon} size={22} color={iconColor} style={styles.icon} />
      <AppText weight="extrabold" style={styles.label}>
        {label}
      </AppText>
      {trailing ? (
        <View style={styles.trailing}>{trailing}</View>
      ) : (
        <View style={styles.trailing}>
          {value !== undefined && (
            <AppText color={colors.textMuted} style={styles.value}>
              {value}
            </AppText>
          )}
          {onPress && <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />}
        </View>
      )}
    </View>
  );

  if (onPress && !trailing) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={value !== undefined ? `${label}: ${value}` : label}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    gap: spacing.md,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  icon: {
    width: 24,
    textAlign: 'center',
  },
  label: {
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    textAlign: 'right',
  },
});

import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './app-text';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional trailing element (badge, action). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Large screen title with optional subtitle and a right-aligned slot. */
export function ScreenHeader({ title, subtitle, right, style }: ScreenHeaderProps): ReactElement {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        <AppText variant="title">{title}</AppText>
        {subtitle && (
          <AppText variant="caption" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 2,
  },
});

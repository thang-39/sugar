import type { ReactElement } from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { colors, fontSize } from '@/ui/theme';
import { AppText } from './app-text';

interface SectionLabelProps {
  children: string;
  style?: StyleProp<TextStyle>;
}

/** Uppercase, letter-spaced muted label above form sections and card groups. */
export function SectionLabel({ children, style }: SectionLabelProps): ReactElement {
  return (
    <AppText weight="extrabold" color={colors.textMuted} style={[styles.label, style]}>
      {children.toUpperCase()}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.xs,
    letterSpacing: 0.8,
  },
});

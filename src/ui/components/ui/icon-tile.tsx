import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactElement } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/ui/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconTileProps {
  icon: IconName;
  /** Background color of the tile. */
  color: string;
  size?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

/** Rounded-square color tile holding a single icon (history avatars, tiles). */
export function IconTile({
  icon,
  color,
  size = 46,
  iconColor = colors.onPrimary,
  style,
}: IconTileProps): ReactElement {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: color },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.48} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});

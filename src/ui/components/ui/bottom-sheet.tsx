import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '@/ui/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Modal-based bottom sheet: dim scrim, rounded top, grab handle, tap-scrim-to-close. */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps): ReactElement {
  const colors = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t('common.close')}>
        {/* Inner Pressable stops taps inside the sheet from closing it. */}
        <Pressable style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
          <View style={[styles.grab, { backgroundColor: colors.borderStrong }]} />
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    // Intentional fixed overlay matching the Evergreen design.
    backgroundColor: 'rgba(27, 43, 36, 0.42)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    maxHeight: '88%',
  },
  grab: {
    width: 40,
    height: 5,
    borderRadius: 99,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
});

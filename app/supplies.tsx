import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SUPPLIES } from '@/config/supplies';
import { AppText, Card, IconTile, Notice } from '@/ui/components/ui';
import { spacing, useTheme } from '@/ui/theme';

export default function SuppliesScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();

  const open = async (url: string): Promise<void> => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('common.errorTitle'));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Notice tone="info" message={t('screens.settings.supplies.disclosure')} />
      {SUPPLIES.map((item) => (
        <Card
          key={item.key}
          onPress={() => void open(item.url)}
          accessibilityLabel={t(`screens.settings.supplies.items.${item.key}.name`)}
        >
          <View style={styles.row}>
            <IconTile icon={item.icon} color={colors.primary} size={44} />
            <View style={styles.text}>
              <AppText weight="extrabold">
                {t(`screens.settings.supplies.items.${item.key}.name`)}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={styles.desc}>
                {t(`screens.settings.supplies.items.${item.key}.desc`)}
              </AppText>
            </View>
            <Ionicons name="open-outline" size={20} color={colors.textFaint} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  desc: { marginTop: 2, lineHeight: 18 },
});

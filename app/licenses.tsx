import { Ionicons } from '@expo/vector-icons';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { LICENSE_TEXT_URLS, OPEN_SOURCE_LICENSES } from '@/config/open-source-licenses';
import { AppText, Card } from '@/ui/components/ui';
import { spacing, useTheme } from '@/ui/theme';

export default function LicensesScreen(): ReactElement {
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
      <AppText color={colors.textMuted} style={styles.intro}>
        {t('screens.settings.licenses.intro')}
      </AppText>

      {OPEN_SOURCE_LICENSES.map((item) => {
        const url = LICENSE_TEXT_URLS[item.license];
        return (
          <Card
            key={item.name}
            onPress={url === undefined ? undefined : () => void open(url)}
            accessibilityLabel={`${item.name} — ${item.license}`}
          >
            <View style={styles.row}>
              <View style={styles.text}>
                <AppText weight="extrabold">{item.name}</AppText>
                <AppText variant="caption" color={colors.textMuted} style={styles.meta}>
                  {item.license} · © {item.copyright}
                </AppText>
              </View>
              {url !== undefined && (
                <Ionicons name="open-outline" size={20} color={colors.textFaint} />
              )}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  intro: { lineHeight: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  meta: { marginTop: 2, lineHeight: 18 },
});

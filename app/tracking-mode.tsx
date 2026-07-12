import { useRouter } from 'expo-router';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ConditionType } from '@/domain/models/condition';
import { AppText, Card, IconTile } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';

export default function TrackingModeScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { conditionType, applyConditionPreset } = useSettingsStore();

  const choose = (next: ConditionType): void => {
    if (next === conditionType) {
      router.back();
      return;
    }
    Alert.alert(
      t('screens.settings.trackingMode.confirmTitle'),
      t('screens.settings.trackingMode.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('screens.settings.trackingMode.confirm'),
          onPress: () => {
            void applyConditionPreset(next).then(() => router.back());
          },
        },
      ],
    );
  };

  const options: { key: ConditionType; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: ConditionType.Gestational, icon: 'woman' },
    { key: ConditionType.General, icon: 'create' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {options.map(({ key, icon }) => {
        const active = conditionType === key;
        return (
          <Card
            key={key}
            onPress={() => choose(key)}
            accessibilityLabel={t(`screens.settings.trackingMode.${key}.title`)}
            style={[styles.card, active && { borderWidth: 2, borderColor: colors.primary }]}
          >
            <View style={styles.row}>
              <IconTile icon={icon} color={colors.primary} size={52} />
              <View style={styles.text}>
                <AppText weight="extrabold" variant="heading">
                  {t(`screens.settings.trackingMode.${key}.title`)}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} style={styles.sub}>
                  {t(`screens.settings.trackingMode.${key}.subtitle`)}
                </AppText>
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={active ? colors.primary : colors.textFaint}
              />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1 },
  sub: { marginTop: 2, lineHeight: 18 },
});

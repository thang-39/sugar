import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  cancelAllSmartReminders,
  reconcileManualReminders,
} from '@/data/notifications/notification-service';
import { rescheduleOgttReminders } from '@/data/notifications/ogtt-reminders';
import { AppText, Button, Card, IconTile, Notice, SectionLabel, Toggle } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';

export default function PostpartumSetupScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { preferredLanguage, smartAfterMeal, manualReminders, updateSetting } = useSettingsStore();

  const [bornAt, setBornAt] = useState<Date>(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [keepReminders, setKeepReminders] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const save = async (): Promise<void> => {
    setIsSaving(true);
    try {
      await updateSetting('babyBornAt', bornAt.getTime());
      if (!keepReminders) {
        const disabled = manualReminders.map((r) => ({ ...r, enabled: false }));
        await updateSetting('manualReminders', disabled);
        await updateSetting('smartAfterMeal', { ...smartAfterMeal, enabled: false });
        await reconcileManualReminders(disabled);
        await cancelAllSmartReminders();
      }
      await rescheduleOgttReminders();
      router.replace('/(tabs)');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <IconTile icon="happy" color={colors.primary} size={56} />
      <AppText variant="title">{t('screens.postpartumSetup.congratsTitle')}</AppText>
      <AppText color={colors.textMuted}>{t('screens.postpartumSetup.congratsSubtitle')}</AppText>

      <Card onPress={() => setShowPicker(true)} style={styles.dateCard}>
        <View style={styles.dateRow}>
          <IconTile icon="calendar" color={colors.primary} size={44} />
          <View style={styles.dateText}>
            <AppText variant="caption" color={colors.textMuted}>
              {t('screens.postpartumSetup.dateLabel')}
            </AppText>
            <AppText weight="black" variant="heading">
              {formatDate(bornAt, preferredLanguage)}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
        </View>
      </Card>

      {showPicker && (
        <DateTimePicker
          value={bornAt}
          mode="date"
          maximumDate={new Date()}
          onChange={(_event, selected) => {
            setShowPicker(Platform.OS === 'ios');
            if (selected) setBornAt(selected);
          }}
        />
      )}

      <SectionLabel style={styles.label}>
        {t('screens.postpartumSetup.keepRemindersLabel')}
      </SectionLabel>
      <Card style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <AppText style={styles.toggleText}>
            {t('screens.postpartumSetup.keepRemindersLabel')}
          </AppText>
          <Toggle
            value={keepReminders}
            onValueChange={setKeepReminders}
            accessibilityLabel={t('screens.postpartumSetup.keepRemindersLabel')}
          />
        </View>
      </Card>
      <Notice tone="info" message={t('screens.postpartumSetup.keepRemindersHint')} />

      <Button
        label={t('screens.postpartumSetup.save')}
        onPress={() => void save()}
        isLoading={isSaving}
        style={styles.save}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  dateCard: { marginTop: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateText: { flex: 1 },
  label: { marginTop: spacing.md },
  toggleCard: {},
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleText: { flex: 1 },
  save: { marginTop: spacing.lg },
});

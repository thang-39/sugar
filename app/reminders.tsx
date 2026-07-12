import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import {
  getAllScheduled,
  getPermissionStatus,
  reconcileManualReminders,
  requestNotificationPermission,
} from '@/data/notifications/notification-service';
import { ConditionType } from '@/domain/models/condition';
import type { ManualReminder, SmartOffset } from '@/domain/models/reminder';
import {
  AppText,
  Card,
  Notice,
  SectionLabel,
  SegmentedControl,
  Toggle,
} from '@/ui/components/ui';
import {
  ReminderEditorSheet,
  type ReminderDateContext,
} from '@/ui/components/reminder-editor-sheet';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { radius, spacing, useTheme, type ColorScheme } from '@/ui/theme';

export default function RemindersScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ new?: string }>();
  const { manualReminders, smartAfterMeal, conditionType, updateSetting } = useSettingsStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ManualReminder | undefined>(undefined);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [debug, setDebug] = useState<string[]>([]);

  const dateContext: ReminderDateContext =
    conditionType === ConditionType.Gestational ? 'gestational' : 'general';

  const refreshDebug = useCallback(async (): Promise<void> => {
    if (!__DEV__) return;
    const all = await getAllScheduled();
    setDebug(all.map((n) => n.identifier));
  }, []);

  useEffect(() => {
    void refreshDebug();
  }, [refreshDebug]);

  useEffect(() => {
    if (params.new === '1') {
      setEditing(undefined);
      setEditorOpen(true);
    }
  }, [params.new]);

  const ensurePermission = async (): Promise<boolean> => {
    const status = await getPermissionStatus();
    if (status === 'granted') return true;
    const granted = await requestNotificationPermission();
    setPermissionDenied(!granted);
    return granted;
  };

  const persistManual = async (list: ManualReminder[]): Promise<void> => {
    await updateSetting('manualReminders', list);
    await reconcileManualReminders(list);
    await refreshDebug();
  };

  const handleSave = async (reminder: ManualReminder): Promise<void> => {
    await ensurePermission();
    const exists = manualReminders.some((r) => r.id === reminder.id);
    const list = exists
      ? manualReminders.map((r) => (r.id === reminder.id ? reminder : r))
      : [...manualReminders, reminder];
    await persistManual(list);
    setEditorOpen(false);
  };

  const handleDelete = async (id: string): Promise<void> => {
    await persistManual(manualReminders.filter((r) => r.id !== id));
    setEditorOpen(false);
  };

  const handleToggle = async (reminder: ManualReminder, enabled: boolean): Promise<void> => {
    if (enabled) await ensurePermission();
    await persistManual(
      manualReminders.map((r) => (r.id === reminder.id ? { ...r, enabled } : r)),
    );
  };

  const handleSmartToggle = async (enabled: boolean): Promise<void> => {
    if (enabled) await ensurePermission();
    await updateSetting('smartAfterMeal', { ...smartAfterMeal, enabled });
  };

  const handleSmartOffset = async (offset: SmartOffset): Promise<void> => {
    await updateSetting('smartAfterMeal', { ...smartAfterMeal, offset });
  };

  const smartHelper = !smartAfterMeal.enabled
    ? t('reminders.smart.helperOff')
    : smartAfterMeal.offset === 'both'
      ? t('reminders.smart.helperBoth')
      : smartAfterMeal.offset === '2h'
        ? t('reminders.smart.helper2h')
        : t('reminders.smart.helper1h');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {permissionDenied && (
        <TouchableOpacity
          style={styles.notice}
          onPress={() => void Linking.openSettings()}
          accessibilityRole="button"
        >
          <Notice tone="warn" message={t('reminders.permissionDenied')} />
        </TouchableOpacity>
      )}

      <SectionLabel style={styles.sectionLabel}>{t('reminders.manual.section')}</SectionLabel>
      <AppText variant="caption" color={colors.textMuted} style={styles.hint}>
        {t('reminders.manual.hint')}
      </AppText>
      <Card style={styles.group}>
        {manualReminders.map((r, i) => (
          <View
            key={r.id}
            style={[styles.row, i < manualReminders.length - 1 && styles.rowBorder]}
          >
            <TouchableOpacity
              style={styles.rowMain}
              onPress={() => {
                setEditing(r);
                setEditorOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={r.label}
            >
              <View style={styles.timePill}>
                <AppText weight="black" color={colors.primary}>
                  {r.time}
                </AppText>
              </View>
              <View style={styles.rowText}>
                <AppText weight="bold" numberOfLines={1}>
                  {r.label}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {r.repeat === 'once'
                    ? t('reminders.manual.onceLabel', { date: r.date })
                    : t('reminders.manual.dailyLabel')}
                </AppText>
              </View>
            </TouchableOpacity>
            <Toggle
              value={r.enabled}
              onValueChange={(v) => void handleToggle(r, v)}
              accessibilityLabel={r.label}
            />
          </View>
        ))}
        <TouchableOpacity
          style={styles.addRow}
          onPress={() => {
            setEditing(undefined);
            setEditorOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('reminders.manual.add')}
        >
          <Ionicons name="add-circle" size={22} color={colors.primary} />
          <AppText weight="extrabold" color={colors.primary}>
            {t('reminders.manual.add')}
          </AppText>
        </TouchableOpacity>
      </Card>

      <SectionLabel style={styles.sectionLabel}>{t('reminders.smart.section')}</SectionLabel>
      <Card style={styles.smartCard}>
        <View style={styles.smartHeader}>
          <Ionicons name="restaurant" size={24} color={colors.accentOrange} />
          <View style={styles.rowText}>
            <AppText weight="extrabold">{t('reminders.smart.title')}</AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('reminders.smart.subtitle')}
            </AppText>
          </View>
          <Toggle
            value={smartAfterMeal.enabled}
            onValueChange={(v) => void handleSmartToggle(v)}
            accessibilityLabel={t('reminders.smart.title')}
          />
        </View>
        {smartAfterMeal.enabled && (
          <SegmentedControl
            value={smartAfterMeal.offset}
            onChange={(v) => void handleSmartOffset(v)}
            style={styles.smartSeg}
            segments={[
              { value: '1h', label: t('reminders.smart.offset1h') },
              { value: '2h', label: t('reminders.smart.offset2h') },
              { value: 'both', label: t('reminders.smart.offsetBoth') },
            ]}
          />
        )}
      </Card>
      <AppText color={colors.textMuted} style={styles.smartHelper}>
        {smartHelper}
      </AppText>

      {__DEV__ && debug.length > 0 && (
        <Card style={styles.debug}>
          <AppText variant="caption" weight="bold">
            DEV · scheduled ({debug.length})
          </AppText>
          {debug.map((id) => (
            <AppText key={id} variant="caption" color={colors.textMuted}>
              {id}
            </AppText>
          ))}
        </Card>
      )}

      <ReminderEditorSheet
        key={editing?.id ?? 'new'}
        visible={editorOpen}
        reminder={editing}
        dateContext={dateContext}
        onClose={() => setEditorOpen(false)}
        onSave={(r) => void handleSave(r)}
        onDelete={(id) => void handleDelete(id)}
      />
    </ScrollView>
  );
}

const makeStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    content: { padding: spacing.lg, gap: spacing.sm },
    notice: { marginBottom: spacing.md },
    sectionLabel: { marginTop: spacing.md, marginBottom: spacing.xs, marginLeft: spacing.xs },
    hint: { marginLeft: spacing.xs, marginBottom: spacing.xs },
    group: { padding: 0, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
    timePill: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    rowText: { flex: 1, minWidth: 0 },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    smartCard: { gap: spacing.md },
    smartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    smartSeg: { marginTop: spacing.xs },
    smartHelper: { marginTop: spacing.sm, marginLeft: spacing.xs, lineHeight: 22 },
    debug: { marginTop: spacing.xl, gap: 2 },
  });

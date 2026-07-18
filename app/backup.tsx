import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { analytics } from '@/data/analytics';
import { exportBackup, ExportBackupStatus } from '@/data/backup/share-backup';
import { pickBackupFile } from '@/data/backup/import-backup';
import { getReadingRepository, getSettingsRepository } from '@/data/repositories/factory';
import type { BackupFile } from '@/domain/models/backup';
import { type AppSettings, DEFAULT_SETTINGS } from '@/domain/models/settings';
import { applyBackup } from '@/domain/use-cases/apply-backup';
import { BackupTooNewError } from '@/domain/use-cases/backup-errors';
import { migrateBackup } from '@/domain/use-cases/migrate-backup';
import { parseBackup } from '@/domain/use-cases/parse-backup';
import { SettingRow } from '@/ui/components/setting-row';
import { AppText, BottomSheet, Button, Card, IconTile } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { spacing, useTheme } from '@/ui/theme';
import { formatDate } from '@/ui/utils/format';
import { haptics } from '@/ui/utils/haptics';

/** Pick just the persisted AppSettings out of the (larger) store state. */
function snapshotSettings(): AppSettings {
  const state = useSettingsStore.getState();
  const keys = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];
  const out = {} as AppSettings;
  for (const key of keys) {
    out[key] = state[key] as never;
  }
  return out;
}

export default function BackupScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const { preferredLanguage, lastLocalBackupAt, updateSetting, rehydrate } = useSettingsStore();

  const [isBusy, setIsBusy] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | undefined>(undefined);

  const title = t('screens.settings.backup.title');

  const onExport = async (): Promise<void> => {
    try {
      setIsBusy(true);
      void haptics.selection();
      const result = await exportBackup({
        readingRepo: getReadingRepository(),
        settings: snapshotSettings(),
        now: Date.now(),
        dialogTitle: title,
      });
      if (result.status === ExportBackupStatus.Shared) {
        await updateSetting('lastLocalBackupAt', Date.now());
        analytics.backupEnabled();
        void haptics.success();
        Alert.alert(title, t('screens.settings.backup.exported'));
      } else {
        Alert.alert(title, t('screens.settings.backup.unavailable'));
      }
    } catch {
      void haptics.error();
      Alert.alert(t('common.errorTitle'), t('screens.settings.backup.exportFailed'));
    } finally {
      setIsBusy(false);
    }
  };

  const onPickRestore = async (): Promise<void> => {
    try {
      setIsBusy(true);
      const raw = await pickBackupFile();
      if (raw === undefined) return; // user cancelled — no-op
      let file: BackupFile;
      try {
        file = migrateBackup(parseBackup(JSON.parse(raw)));
      } catch (err) {
        // JSON.parse SyntaxError + BackupMalformedError → malformed; too-new is distinct.
        const message =
          err instanceof BackupTooNewError
            ? t('screens.settings.backup.tooNew')
            : t('screens.settings.backup.malformed');
        void haptics.error();
        Alert.alert(title, message);
        return;
      }
      setPendingRestore(file);
    } finally {
      setIsBusy(false);
    }
  };

  const onConfirmRestore = async (): Promise<void> => {
    const file = pendingRestore;
    setPendingRestore(undefined);
    if (file === undefined) return;
    try {
      setIsBusy(true);
      void haptics.selection();
      const result = await applyBackup(file, {
        readingRepo: getReadingRepository(),
        settingsRepo: getSettingsRepository(),
      });
      // Restored settings rows bypass the boot-guarded initialize(); re-read them.
      // Readings refresh on tab focus (useReadings) when the user navigates back.
      await rehydrate();
      void haptics.success();
      const message =
        result.skipped > 0
          ? t('screens.settings.backup.successSkipped', {
              count: result.restored,
              skipped: result.skipped,
            })
          : t('screens.settings.backup.success', { count: result.restored });
      Alert.alert(title, message);
    } catch {
      void haptics.error();
      Alert.alert(t('common.errorTitle'), t('screens.settings.backup.restoreFailed'));
    } finally {
      setIsBusy(false);
    }
  };

  const lastBackupText =
    lastLocalBackupAt !== null
      ? t('screens.settings.backup.lastBackup', {
          date: formatDate(new Date(lastLocalBackupAt), preferredLanguage),
        })
      : t('screens.settings.backup.neverBackedUp');

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppText color={colors.textMuted} style={styles.description}>
        {t('screens.settings.backup.description')}
      </AppText>

      <Card style={styles.group}>
        <SettingRow
          icon="cloud-upload"
          iconColor={colors.primary}
          label={t('screens.settings.backup.export.label')}
          subtitle={t('screens.settings.backup.export.subtitle')}
          onPress={() => void onExport()}
        />
        <SettingRow
          icon="cloud-download"
          iconColor={colors.accentPurple}
          label={t('screens.settings.backup.restore.label')}
          subtitle={t('screens.settings.backup.restore.subtitle')}
          isLast
          onPress={() => void onPickRestore()}
        />
      </Card>

      <AppText variant="caption" color={colors.textMuted} style={styles.footnote}>
        {lastBackupText}
      </AppText>

      <BottomSheet
        visible={pendingRestore !== undefined}
        onClose={() => setPendingRestore(undefined)}
      >
        <View style={styles.sheet}>
          <IconTile
            icon="cloud-download"
            color={colors.surface}
            iconColor={colors.primary}
            size={56}
            style={styles.sheetIcon}
          />
          <AppText variant="title" weight="black" style={styles.sheetTitle}>
            {t('screens.settings.backup.confirm.title')}
          </AppText>
          <AppText color={colors.textMuted} style={styles.sheetBody}>
            {t('screens.settings.backup.confirm.message')}
          </AppText>
          <Button
            label={t('screens.settings.backup.confirm.restore')}
            onPress={() => void onConfirmRestore()}
            isLoading={isBusy}
            style={styles.sheetButton}
          />
          <Button
            variant="ghost"
            label={t('screens.settings.backup.confirm.cancel')}
            onPress={() => setPendingRestore(undefined)}
          />
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
  description: { marginTop: spacing.sm, marginBottom: spacing.sm, lineHeight: 22 },
  group: { padding: 0, overflow: 'hidden' },
  footnote: { marginTop: spacing.sm, marginLeft: spacing.xs },
  sheet: { alignItems: 'stretch', gap: spacing.sm },
  sheetIcon: { alignSelf: 'center' },
  sheetTitle: { textAlign: 'center', marginTop: spacing.md },
  sheetBody: { textAlign: 'center', lineHeight: 22, marginBottom: spacing.md },
  sheetButton: { marginTop: spacing.sm },
});

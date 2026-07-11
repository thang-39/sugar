import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import type { ManualReminder, RepeatKind } from '@/domain/models/reminder';
import { AppText, BottomSheet, Button, SectionLabel, SegmentedControl } from '@/ui/components/ui';
import { fontFamily, fontSize, radius, spacing, useTheme } from '@/ui/theme';

/** Context for the one-time date label (pregnancy lifecycle → wording). */
export type ReminderDateContext = 'general' | 'gestational' | 'postpartum';

interface Props {
  visible: boolean;
  reminder?: ManualReminder;
  dateContext: ReminderDateContext;
  onClose: () => void;
  onSave: (reminder: ManualReminder) => void;
  onDelete: (id: string) => void;
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y as number, (m as number) - 1, d as number);
}

function dateToISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ReminderEditorSheet({
  visible,
  reminder,
  dateContext,
  onClose,
  onSave,
  onDelete,
}: Props): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const isEdit = reminder !== undefined;

  const [label, setLabel] = useState(reminder?.label ?? '');
  const [time, setTime] = useState(reminder?.time ?? '08:00');
  const [repeat, setRepeat] = useState<RepeatKind>(reminder?.repeat ?? 'daily');
  const [date, setDate] = useState(reminder?.date ?? todayISO());
  const [showPicker, setShowPicker] = useState<'time' | 'date' | null>(null);

  const dateLabel =
    dateContext === 'gestational'
      ? t('reminders.editor.dateLabel.pregnancy')
      : dateContext === 'postpartum'
        ? t('reminders.editor.dateLabel.postpartum')
        : t('reminders.editor.dateLabel.general');

  const handleSave = (): void => {
    onSave({
      id: reminder?.id ?? `m${Date.now()}`,
      label: label.trim() || t('reminders.editor.defaultName'),
      time,
      enabled: reminder?.enabled ?? true,
      repeat,
      date: repeat === 'once' ? date : undefined,
    });
  };

  const timeDate = (() => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h as number, m as number, 0, 0);
    return d;
  })();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <AppText variant="title" weight="black">
        {isEdit ? t('reminders.editor.editTitle') : t('reminders.editor.newTitle')}
      </AppText>

      <SectionLabel style={styles.label}>{t('reminders.editor.nameLabel')}</SectionLabel>
      <TextInput
        style={[styles.input, { borderColor: colors.borderStrong, color: colors.text }]}
        value={label}
        onChangeText={setLabel}
        placeholder={t('reminders.editor.namePlaceholder')}
        placeholderTextColor={colors.textDisabled}
      />

      <SectionLabel style={styles.label}>{t('reminders.editor.timeLabel')}</SectionLabel>
      <TouchableOpacity
        style={[styles.input, styles.timeField, { borderColor: colors.borderStrong }]}
        onPress={() => setShowPicker('time')}
        accessibilityRole="button"
        accessibilityLabel={t('reminders.editor.timeLabel')}
      >
        <Ionicons name="time-outline" size={22} color={colors.primary} />
        <AppText weight="extrabold" style={styles.timeText}>
          {time}
        </AppText>
      </TouchableOpacity>

      <SectionLabel style={styles.label}>{t('reminders.editor.repeatLabel')}</SectionLabel>
      <SegmentedControl
        value={repeat}
        onChange={setRepeat}
        segments={[
          { value: 'daily', label: t('reminders.editor.repeatDaily') },
          { value: 'once', label: t('reminders.editor.repeatOnce') },
        ]}
      />

      {repeat === 'once' && (
        <>
          <SectionLabel style={styles.label}>{dateLabel}</SectionLabel>
          <TouchableOpacity
            style={[styles.input, styles.timeField, { borderColor: colors.borderStrong }]}
            onPress={() => setShowPicker('date')}
            accessibilityRole="button"
            accessibilityLabel={dateLabel}
          >
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            <AppText weight="extrabold" style={styles.timeText}>
              {date}
            </AppText>
          </TouchableOpacity>
        </>
      )}

      <Button
        label={isEdit ? t('common.save') : t('reminders.editor.addButton')}
        onPress={handleSave}
        style={styles.save}
      />
      {isEdit && (
        <Button
          variant="dangerOutline"
          label={t('reminders.editor.delete')}
          onPress={() => onDelete(reminder.id)}
          style={styles.delete}
        />
      )}

      {showPicker === 'time' && (
        <DateTimePicker
          value={timeDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => {
            setShowPicker(null);
            if (d)
              setTime(
                `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              );
          }}
        />
      )}
      {showPicker === 'date' && (
        <DateTimePicker
          value={isoToDate(date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, d) => {
            setShowPicker(null);
            if (d) setDate(dateToISO(d));
          }}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: spacing.lg },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    fontSize: fontSize.base,
    fontFamily: fontFamily.bold,
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
  },
  timeText: { fontSize: fontSize.lg },
  save: { marginTop: spacing.xl },
  delete: { marginTop: spacing.sm },
});

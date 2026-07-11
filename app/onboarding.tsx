import { useRouter } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AfterMealProtocol, CONDITION_PRESETS, ConditionType } from '@/domain/models/condition';
import { Language } from '@/domain/models/settings';
import { Unit } from '@/domain/models/unit';
import { AppText, Button, Card, IconTile, SectionLabel, SegmentedControl } from '@/ui/components/ui';
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { radius, spacing, useTheme } from '@/ui/theme';
import { formatValue } from '@/ui/utils/format';

type Step = 'welcome' | 'condition' | 'gdm';

interface Feature {
  key: 'log' | 'trends' | 'export' | 'offline';
  color: string;
  fg: string;
}

export default function OnboardingScreen(): ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const { preferredUnit, preferredLanguage, updateSetting, applyConditionPreset } =
    useSettingsStore();

  const [step, setStep] = useState<Step>('welcome');
  const [protocol, setProtocol] = useState<AfterMealProtocol>(AfterMealProtocol.OneHour);
  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 70); // ~10 weeks out — sensible default
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  const FEATURES: readonly Feature[] = [
    { key: 'log', color: colors.accentBlue, fg: colors.onPrimary },
    { key: 'trends', color: colors.accentPurple, fg: colors.onPrimary },
    { key: 'export', color: colors.accentAmber, fg: colors.text },
    { key: 'offline', color: colors.accentOrange, fg: colors.onPrimary },
  ];

  const gestPreset = CONDITION_PRESETS.gestational;

  // --- flow handlers ---
  const finishGeneral = async (): Promise<void> => {
    await applyConditionPreset(ConditionType.General);
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };

  const skip = async (): Promise<void> => {
    await updateSetting('preferredLanguage', Language.Vietnamese);
    await updateSetting('preferredUnit', Unit.MgDl);
    await finishGeneral();
  };

  const pickGestational = async (): Promise<void> => {
    // Persist conditionType now so the theme previews rose on the gdm step.
    await updateSetting('conditionType', ConditionType.Gestational);
    setStep('gdm');
  };

  const backFromGdm = async (): Promise<void> => {
    await updateSetting('conditionType', ConditionType.General); // revert theme preview
    setStep('condition');
  };

  const finishGestational = async (): Promise<void> => {
    await applyConditionPreset(ConditionType.Gestational);
    await updateSetting('dueDate', dueDate.getTime());
    await updateSetting('afterMealProtocol', protocol);
    await updateSetting('onboardingDone', true);
    router.replace('/(tabs)');
  };

  const dueLabel = dueDate.toLocaleDateString(preferredLanguage === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function buildPreview(): string {
    const u = preferredUnit;
    const fasting = `${t('screens.onboarding.gdm.labels.fasting')} <${formatValue(gestPreset.fastingRange.high, u)}`;
    const a1 = `${t('screens.onboarding.gdm.labels.after1h')} <${formatValue(gestPreset.postMealRange.high, u)}`;
    const a2 = `${t('screens.onboarding.gdm.labels.after2h')} <${formatValue(gestPreset.postMeal2hRange?.high ?? 120, u)}`;
    if (protocol === AfterMealProtocol.TwoHours) return `${fasting} · ${a2} ${u}`;
    if (protocol === AfterMealProtocol.OneThenTwo) return `${fasting} · ${a1} · ${a2} ${u}`;
    return `${fasting} · ${a1} ${u}`;
  }
  const previewLine = buildPreview();

  const Dots = ({ active }: { active: 0 | 1 | 2 }): ReactElement => (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === active ? colors.primary : colors.surfaceMuted, width: i === active ? 24 : 8 },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ---------- WELCOME ---------- */}
        {step === 'welcome' && (
          <>
            <View style={styles.headerRow}>
              <Dots active={0} />
              <Button variant="ghost" label={t('screens.onboarding.skip')} onPress={() => void skip()} style={styles.skipBtn} />
            </View>

            <View style={styles.hero}>
              <IconTile icon="water" color={colors.primary} size={64} />
              <AppText variant="title">{t('app.name')}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {t('app.tagline')}
              </AppText>
            </View>

            <View style={styles.grid}>
              {FEATURES.map((f) => (
                <View key={f.key} style={[styles.featureCard, { backgroundColor: f.color }]}>
                  <AppText weight="extrabold" color={f.fg}>
                    {t(`screens.onboarding.features.${f.key}.title`)}
                  </AppText>
                  <AppText variant="caption" color={f.fg} style={styles.featureSub}>
                    {t(`screens.onboarding.features.${f.key}.subtitle`)}
                  </AppText>
                </View>
              ))}
            </View>

            <View style={styles.pickerGroup}>
              <SectionLabel>{t('screens.onboarding.languageLabel')}</SectionLabel>
              <SegmentedControl
                segments={[
                  { value: Language.Vietnamese, label: t('screens.onboarding.languages.vi') },
                  { value: Language.English, label: t('screens.onboarding.languages.en') },
                ]}
                value={preferredLanguage}
                onChange={(v) => void updateSetting('preferredLanguage', v)}
              />
            </View>

            <View style={styles.pickerGroup}>
              <SectionLabel>{t('screens.onboarding.unitLabel')}</SectionLabel>
              <SegmentedControl
                segments={[
                  { value: Unit.MgDl, label: Unit.MgDl },
                  { value: Unit.MmolL, label: Unit.MmolL },
                ]}
                value={preferredUnit}
                onChange={(v) => void updateSetting('preferredUnit', v)}
              />
            </View>

            <AppText variant="caption" color={colors.textFaint} style={styles.disclaimer}>
              {t('common.disclaimer')}
            </AppText>

            <Button variant="primary" uppercase label={t('screens.onboarding.getStarted')} onPress={() => setStep('condition')} />
          </>
        )}

        {/* ---------- CONDITION SELECT ---------- */}
        {step === 'condition' && (
          <>
            <View style={styles.headerRow}>
              <BackButton onPress={() => setStep('welcome')} color={colors.text} border={colors.border} />
              <Dots active={1} />
              <View style={styles.headerSpacer} />
            </View>

            <AppText variant="title" style={styles.stepTitle}>
              {t('screens.onboarding.condition.title')}
            </AppText>

            <View style={styles.conditionList}>
              <ConditionCard
                icon="woman"
                title={t('screens.onboarding.condition.gestational.title')}
                subtitle={t('screens.onboarding.condition.gestational.subtitle')}
                onPress={() => void pickGestational()}
              />
              <ConditionCard
                icon="create"
                title={t('screens.onboarding.condition.general.title')}
                subtitle={t('screens.onboarding.condition.general.subtitle')}
                onPress={() => void finishGeneral()}
              />
            </View>

            <Button variant="ghost" label={t('screens.onboarding.skip')} onPress={() => void skip()} style={styles.centerGhost} />
          </>
        )}

        {/* ---------- GDM DETAIL ---------- */}
        {step === 'gdm' && (
          <>
            <View style={styles.headerRow}>
              <BackButton onPress={() => void backFromGdm()} color={colors.text} border={colors.border} />
              <Dots active={2} />
              <View style={styles.headerSpacer} />
            </View>

            <AppText variant="title" style={styles.stepTitle}>
              {t('screens.onboarding.gdm.title')}
            </AppText>

            <Card onPress={() => setShowPicker(true)} style={styles.dueCard}>
              <View style={styles.dueRow}>
                <IconTile icon="calendar" color={colors.primary} size={44} />
                <View style={styles.dueText}>
                  <AppText variant="caption" color={colors.textMuted}>
                    {t('screens.onboarding.gdm.dueDateLabel')}
                  </AppText>
                  <AppText weight="black" variant="heading">
                    {dueLabel}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
              </View>
            </Card>

            {showPicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(_event, selected) => {
                  setShowPicker(Platform.OS === 'ios');
                  if (selected) setDueDate(selected);
                }}
              />
            )}

            <SectionLabel style={styles.protocolLabel}>
              {t('screens.onboarding.gdm.protocolQuestion')}
            </SectionLabel>
            <View style={styles.protocolList}>
              {[AfterMealProtocol.OneHour, AfterMealProtocol.TwoHours, AfterMealProtocol.OneThenTwo].map(
                (p) => {
                  const active = protocol === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setProtocol(p)}
                      style={[
                        styles.protocolOption,
                        {
                          backgroundColor: colors.card,
                          borderColor: active ? colors.primary : colors.border,
                          borderWidth: active ? 2 : 1.5,
                        },
                      ]}
                    >
                      <AppText weight="extrabold" style={styles.protocolText}>
                        {t(`screens.onboarding.gdm.protocols.${p}`)}
                      </AppText>
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={22}
                        color={active ? colors.primary : colors.textFaint}
                      />
                    </Pressable>
                  );
                },
              )}
            </View>

            <View style={[styles.previewBox, { backgroundColor: colors.surface }]}>
              <AppText variant="caption" weight="extrabold" color={colors.inRangeText}>
                {t('screens.onboarding.gdm.previewTitle')}
              </AppText>
              <AppText weight="extrabold" style={styles.previewLine}>
                {previewLine}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={styles.previewAdjust}>
                {t('screens.onboarding.gdm.previewAdjust')}
              </AppText>
            </View>

            <Button variant="primary" uppercase label={t('screens.onboarding.gdm.start')} onPress={() => void finishGestational()} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BackButton({ onPress, color, border }: { onPress: () => void; color: string; border: string }): ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.backBtn, { borderColor: border }]}
    >
      <Ionicons name="arrow-back" size={20} color={color} />
    </Pressable>
  );
}

function ConditionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}): ReactElement {
  const colors = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={title} style={styles.condCard}>
      <View style={styles.condRow}>
        <IconTile icon={icon} color={colors.primary} size={52} />
        <View style={styles.condText}>
          <AppText weight="extrabold" variant="heading">
            {title}
          </AppText>
          <AppText variant="caption" color={colors.textMuted} style={styles.condSub}>
            {subtitle}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textFaint} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 40 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 99 },
  skipBtn: { alignSelf: 'flex-end' },
  centerGhost: { alignSelf: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 99,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  hero: { alignItems: 'center', gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  featureCard: { flexGrow: 1, flexBasis: '45%', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  featureSub: { opacity: 0.85 },
  pickerGroup: { gap: spacing.sm },
  disclaimer: { textAlign: 'center', lineHeight: 20 },
  stepTitle: { marginTop: spacing.sm },
  conditionList: { gap: spacing.md },
  condCard: {},
  condRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  condText: { flex: 1 },
  condSub: { marginTop: 2, lineHeight: 18 },
  dueCard: {},
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dueText: { flex: 1 },
  protocolLabel: { marginTop: spacing.sm },
  protocolList: { gap: spacing.sm },
  protocolOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  protocolText: { flex: 1 },
  previewBox: { borderRadius: radius.lg, padding: spacing.lg },
  previewLine: { marginTop: 6, lineHeight: 24 },
  previewAdjust: { marginTop: 8 },
});

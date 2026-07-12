import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { analytics } from '@/data/analytics';
import { PaywallSource, toPaywallSource } from '@/domain/models/paywall';
import { PRO_BENEFITS } from '@/config/pro-benefits';
import { AppText, Button, Card } from '@/ui/components/ui';
import { useEntitlementStore } from '@/ui/hooks/use-entitlement';
import { fontSize, radius, spacing, useTheme } from '@/ui/theme';
import { haptics } from '@/ui/utils/haptics';

/** Sources that get a contextual intro line above the generic pitch. */
const CONTEXT_SOURCES: readonly PaywallSource[] = [
  PaywallSource.ReportGate,
  PaywallSource.CsvGate,
  PaywallSource.ChartsGate,
  PaywallSource.BackupGate,
];

export default function PaywallScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ paywallSource?: string }>();
  const source = toPaywallSource(params.paywallSource);

  const { isPro, proProduct, refresh, purchase, restore } = useEntitlementStore();
  const [isBusy, setIsBusy] = useState(false);

  // Load the product + entitlement and log the view exactly once per open.
  useEffect(() => {
    void refresh();
    analytics.paywallViewed(source);
  }, [refresh, source]);

  const close = (): void => router.back();

  const onPurchase = async (): Promise<void> => {
    setIsBusy(true);
    try {
      const result = await purchase();
      switch (result.outcome) {
        case 'Success':
          void haptics.success();
          analytics.purchaseCompleted();
          Alert.alert(t('paywall.success.title'), t('paywall.success.message'), [
            { text: t('common.done'), onPress: close },
          ]);
          break;
        case 'Pending':
          Alert.alert(t('paywall.pending.title'), t('paywall.pending.message'));
          break;
        case 'Cancelled':
          break; // clean — user backed out, stay on the paywall
        case 'Error':
          void haptics.error();
          Alert.alert(t('paywall.error.title'), result.errorMessage ?? t('paywall.error.message'));
          break;
      }
    } finally {
      setIsBusy(false);
    }
  };

  const onRestore = async (): Promise<void> => {
    setIsBusy(true);
    try {
      const restored = await restore();
      if (restored) {
        void haptics.success();
        Alert.alert(t('paywall.restore.successTitle'), t('paywall.restore.successMessage'), [
          { text: t('common.done'), onPress: close },
        ]);
      } else {
        Alert.alert(t('paywall.restore.noneTitle'), t('paywall.restore.noneMessage'));
      }
    } finally {
      setIsBusy(false);
    }
  };

  // Already Pro (e.g. opened from Settings after purchase): show a simple state.
  if (isPro) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="checkmark-circle" size={72} color={colors.primary} />
        <AppText variant="title" style={styles.centerText}>
          {t('paywall.alreadyPro.title')}
        </AppText>
        <AppText color={colors.textMuted} style={styles.centerText}>
          {t('paywall.alreadyPro.subtitle')}
        </AppText>
        <Button label={t('common.close')} variant="ghost" onPress={close} style={styles.closeBtn} />
      </View>
    );
  }

  const priceString = proProduct?.priceString;
  const ctaLabel = priceString ? t('paywall.cta') : t('paywall.ctaLoading');

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.hero}>
        <View style={[styles.crown, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="star" size={30} color={colors.primary} />
        </View>
        <AppText variant="title" style={styles.centerText}>
          {t('paywall.title')}
        </AppText>
        <AppText color={colors.textMuted} style={styles.centerText}>
          {t('paywall.subtitle')}
        </AppText>
      </View>

      {CONTEXT_SOURCES.includes(source) && (
        <Card style={[styles.contextCard, { backgroundColor: colors.primaryLight }]}>
          <AppText color={colors.text}>{t(`paywall.context.${source}`)}</AppText>
        </Card>
      )}

      <Card style={styles.benefitsCard}>
        {PRO_BENEFITS.map((benefit) => (
          <View key={benefit.key} style={styles.benefitRow}>
            <Ionicons name={benefit.icon} size={22} color={colors.primary} />
            <AppText style={styles.benefitText}>{t(`paywall.benefits.${benefit.key}`)}</AppText>
          </View>
        ))}
      </Card>

      <AppText variant="caption" color={colors.textMuted} style={styles.launchNote}>
        {t('paywall.launchNote')}
      </AppText>

      <Button
        label={ctaLabel}
        variant="primary"
        icon="lock-open"
        onPress={() => void onPurchase()}
        isLoading={isBusy}
        disabled={isBusy || priceString === undefined}
        style={styles.cta}
      />

      {priceString !== undefined && (
        <AppText variant="caption" color={colors.textMuted} style={styles.centerText}>
          {t('paywall.priceLine', { price: priceString })}
        </AppText>
      )}

      <Button
        label={t('paywall.restore.action')}
        variant="ghost"
        onPress={() => void onRestore()}
        disabled={isBusy}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  crown: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centerText: {
    textAlign: 'center',
  },
  contextCard: {
    borderWidth: 0,
  },
  benefitsCard: {
    gap: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  benefitText: {
    flex: 1,
    fontSize: fontSize.base,
  },
  launchNote: {
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.sm,
  },
  closeBtn: {
    marginTop: spacing.lg,
  },
});

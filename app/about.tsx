import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useEffect, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { getEntitlementRepository } from '@/data/repositories/factory';
import { AppText, Button, Card } from '@/ui/components/ui';
import { radius, spacing, useTheme } from '@/ui/theme';
import { haptics } from '@/ui/utils/haptics';

// Hosted via GitHub Pages (see docs/privacy.html + the Session 14 launch guide).
const PRIVACY_URL = 'https://thang-39.github.io/sugar/privacy.html';

export default function AboutScreen(): ReactElement {
  const { t } = useTranslation();
  const colors = useTheme();
  const [isOpening, setIsOpening] = useState(false);
  const [supportCode, setSupportCode] = useState<string | undefined>(undefined);
  const [isCopied, setIsCopied] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    let active = true;
    void getEntitlementRepository()
      .getAppUserId()
      .then((code) => {
        if (active) setSupportCode(code);
      })
      .catch(() => {
        /* leave the code hidden if it can't be loaded */
      });
    return () => {
      active = false;
    };
  }, []);

  const openPrivacy = async (): Promise<void> => {
    try {
      setIsOpening(true);
      await Linking.openURL(PRIVACY_URL);
    } catch {
      Alert.alert(t('common.errorTitle'));
    } finally {
      setIsOpening(false);
    }
  };

  const copyCode = async (): Promise<void> => {
    if (supportCode === undefined) return;
    await Clipboard.setStringAsync(supportCode);
    void haptics.success();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppText variant="title">{t('app.name')}</AppText>
        <AppText color={colors.textMuted}>
          {t('screens.settings.about.version', { version })}
        </AppText>
      </View>

      <Card>
        <AppText style={styles.disclaimer}>{t('common.disclaimer')}</AppText>
      </Card>

      {supportCode !== undefined && (
        <Card style={styles.supportCard}>
          <View style={styles.supportText}>
            <AppText weight="extrabold">{t('screens.settings.about.supportCode')}</AppText>
            <AppText variant="caption" color={colors.textMuted} style={styles.supportHint}>
              {t('screens.settings.about.supportHint')}
            </AppText>
          </View>
          <AppText weight="bold" style={styles.code}>
            {supportCode}
          </AppText>
          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: colors.surface }]}
            onPress={() => void copyCode()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('screens.settings.about.supportCode')}
          >
            <Ionicons
              name={isCopied ? 'checkmark' : 'copy-outline'}
              size={20}
              color={isCopied ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
        </Card>
      )}

      {isCopied && (
        <AppText variant="caption" color={colors.primary} style={styles.copied}>
          {t('screens.settings.about.copied')}
        </AppText>
      )}

      <Button
        variant="ghost"
        label={t('screens.settings.about.privacyPolicy')}
        icon="shield-checkmark-outline"
        onPress={() => void openPrivacy()}
        isLoading={isOpening}
        accessibilityRole="link"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  disclaimer: {
    lineHeight: 24,
    textAlign: 'center',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  supportText: {
    flex: 1,
    minWidth: 0,
  },
  supportHint: {
    marginTop: 2,
    lineHeight: 18,
  },
  code: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copied: {
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
});

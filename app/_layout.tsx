import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { AppState, StyleSheet, ActivityIndicator, View, Text, TextInput } from 'react-native';
import type { TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';

// Drizzle migrations
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import migrations from '../drizzle/migrations';
import { initDatabase } from '@/data/db/client';
import type * as schema from '@/data/db/schema';

// Settings store
import { useSettingsStore } from '@/ui/hooks/use-settings';
import { useEntitlementStore } from '@/ui/hooks/use-entitlement';

// Side-effect import: initializes i18next before any screen renders.
import '@/i18n';
import { colors, fontSize, fontFamily, ThemeProvider, useTheme } from '@/ui/theme';
import {
  configureNotifications,
  type ReminderPayload,
} from '@/data/notifications/notification-service';
import { rescheduleWeeklySummary } from '@/data/notifications/weekly-summary';
import { rescheduleOgttReminders } from '@/data/notifications/ogtt-reminders';
import { getReadingRepository, initEntitlement } from '@/data/repositories/factory';
import { maybeRequestReview } from '@/data/review/request-review';
import { toLogParams } from '@/ui/utils/log-prefill';

type Db = ExpoSQLiteDatabase<typeof schema>;

// Make Nunito the default font for any <Text>/<TextInput> not yet migrated to a
// primitive, so nothing renders in the system font ("half old, half new"). Bold
// text still needs an explicit fontFamily token — RN ignores fontWeight on a
// custom font. Runs once at module load; harmless before fonts finish loading.
type DefaultStyled = { defaultProps?: { style?: TextStyle } };
function applyDefaultFont(): void {
  const base: TextStyle = { fontFamily: fontFamily.regular };
  for (const component of [Text, TextInput] as unknown as DefaultStyled[]) {
    component.defaultProps = { ...component.defaultProps, style: base };
  }
}
applyDefaultFont();

export default function RootLayout(): ReactElement {
  // The database must be OPENED before migrations run. On web this is async
  // (the wa-sqlite worker has to warm up first, see initDatabase); on native it
  // resolves on the next tick. Gating render here keeps `useMigrations` in the
  // inner component from ever seeing an un-opened handle.
  const [db, setDb] = useState<Db | undefined>(undefined);
  const [openError, setOpenError] = useState<string | undefined>(undefined);

  useEffect(() => {
    initDatabase()
      .then(setDb)
      .catch((err: unknown) => {
        setOpenError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  if (openError !== undefined) {
    return <BootError message={openError} />;
  }
  if (db === undefined) {
    return <BootSpinner />;
  }
  return <RootLayoutReady db={db} />;
}

function RootLayoutReady({ db }: { db: Db }): ReactElement {
  const { success: isDbReady, error: dbError } = useMigrations(db, migrations);
  const { isInitialized, initError, initialize: initializeSettings } = useSettingsStore();
  const { i18n } = useTranslation();
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  useEffect(() => {
    if (!isDbReady) return;
    // The `.catch` is mandatory: an uncaught rejection (e.g. corrupt persisted JSON)
    // would otherwise leave `isInitialized` false forever and hang on the spinner.
    initializeSettings()
      .then(() => {
        const lang = useSettingsStore.getState().preferredLanguage;
        return i18n.changeLanguage(lang);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        useSettingsStore.setState({ initError: message });
      });
  }, [isDbReady, initializeSettings, i18n]);

  const router = useRouter();
  const [pendingResponse, setPendingResponse] = useState<ReminderPayload | undefined>(undefined);

  useEffect(() => {
    void configureNotifications().catch(() => {});
  }, []);

  // Entitlement: pull once at boot and re-pull on every foreground so a purchase
  // made elsewhere (or the RC offline cache expiring) is reflected. Single source
  // of truth is the zustand cache in useEntitlementStore.
  useEffect(() => {
    initEntitlement(); // configure RevenueCat before any entitlement call (no-op if unconfigured)
    const refresh = (): void => void useEntitlementStore.getState().refresh();
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, []);

  // Capture the notification response (cold-start + warm) without routing yet —
  // on a killed-app cold start the navigator isn't mounted, so routing here would
  // be dropped. The consumer effect below routes once the app is booted.
  useEffect(() => {
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          setPendingResponse(response.notification.request.content.data as ReminderPayload);
        }
      })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      setPendingResponse(response.notification.request.content.data as ReminderPayload);
    });
    return () => sub.remove();
  }, []);

  // Boot-ready is the negation of the spinner gate below; deep-link routing must
  // wait until the <Stack> is mounted or expo-router silently drops the push.
  const isBooted = isDbReady && isInitialized && fontsLoaded;
  useEffect(() => {
    if (!isBooted || pendingResponse === undefined) return;
    const payload = pendingResponse;
    setPendingResponse(undefined);
    if (payload.kind === 'manual') {
      router.push('/(tabs)');
      return;
    }
    if (payload.kind === 'weekly') {
      router.push('/(tabs)/trends');
      return;
    }
    if (payload.kind === 'ogtt') {
      router.push('/(tabs)');
      return;
    }
    router.push({
      pathname: '/(tabs)/log',
      params: toLogParams({
        mealType: payload.mealType,
        mealTiming: payload.mealTiming,
        hoursAfterMeal: payload.hoursAfterMeal,
      }),
    });
  }, [isBooted, pendingResponse, router]);

  // Session 20 retention loop: on every foreground (once booted so the DB +
  // settings are ready) reconcile the weekly-summary notification and — as a
  // fallback for users who never export a report — check the review prompt gate.
  useEffect(() => {
    if (!isBooted) return;
    const run = (): void => {
      void rescheduleWeeklySummary().catch(() => {});
      void rescheduleOgttReminders().catch(() => {});
      void maybeReviewFallback().catch(() => {});
    };
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [isBooted]);

  const bootError = dbError?.message ?? initError;
  if (bootError !== undefined) {
    return <BootError message={bootError} />;
  }

  if (!isBooted) {
    return <BootSpinner />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootStack />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The root navigator. Split out of RootLayoutReady so it renders UNDER
 * <ThemeProvider> and can read the active scheme via useTheme() — the header /
 * content backgrounds then follow the tracking mode (Evergreen ↔ Rose). The
 * parent can't do this: it *renders* the provider, so it isn't inside it.
 */
function RootStack(): ReactElement {
  const { t } = useTranslation();
  const scheme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: scheme.background },
        headerTintColor: scheme.text,
        headerTitleStyle: { fontSize: fontSize.lg, fontFamily: fontFamily.extrabold },
        contentStyle: { backgroundColor: scheme.background },
        // Chevron-only back button — the previous route is the "(tabs)" group,
        // whose name would otherwise show as the iOS back-title. Applied here so
        // every pushed screen is consistent (no per-screen headerLeft).
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="reading/[id]/index"
        options={{ headerShown: true, title: t('screens.readingDetail.title') }}
      />
      <Stack.Screen
        name="reading/[id]/edit"
        options={{ headerShown: true, title: t('screens.editReading.title') }}
      />
      <Stack.Screen
        name="report"
        options={{ headerShown: true, title: t('screens.settings.report.title') }}
      />
      <Stack.Screen name="reminders" options={{ headerShown: true, title: t('reminders.title') }} />
      <Stack.Screen
        name="target-range"
        options={{ headerShown: true, title: t('screens.settings.targetRange.title') }}
      />
      <Stack.Screen
        name="tracking-mode"
        options={{ headerShown: true, title: t('screens.settings.trackingMode.title') }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: true, title: t('screens.settings.about.title') }}
      />
      <Stack.Screen
        name="postpartum-setup"
        options={{ headerShown: true, title: t('screens.postpartumSetup.title') }}
      />
      <Stack.Screen
        name="supplies"
        options={{ headerShown: true, title: t('screens.settings.supplies.title') }}
      />
      <Stack.Screen
        name="backup"
        options={{ headerShown: true, title: t('screens.settings.backup.title') }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: true, presentation: 'modal', title: t('paywall.title') }}
      />
    </Stack>
  );
}

/** Review-prompt fallback (20th reading) for users who never export a report. */
async function maybeReviewFallback(): Promise<void> {
  const store = useSettingsStore.getState();
  const readingCount = await getReadingRepository().count();
  await maybeRequestReview(
    { reviewAskedAt: store.reviewAskedAt, reportCount: store.reportCount, readingCount },
    () => useSettingsStore.getState().updateSetting('reviewAskedAt', Date.now()),
  );
}

function BootSpinner(): ReactElement {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function BootError({ message }: { message: string }): ReactElement {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{t('common.dbError', { message })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
  },
});

import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement } from 'react';
import { StyleSheet, ActivityIndicator, View, Text, TextInput } from 'react-native';
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

// Side-effect import: initializes i18next before any screen renders.
import '@/i18n';
import { colors, fontSize, fontFamily, ThemeProvider } from '@/ui/theme';
import {
  configureNotifications,
  type ReminderPayload,
} from '@/data/notifications/notification-service';
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

  useEffect(() => {
    void configureNotifications();
  }, []);

  useEffect(() => {
    const routeFromPayload = (payload: ReminderPayload | undefined): void => {
      if (!payload || payload.kind === 'manual') {
        router.push('/(tabs)');
        return;
      }
      router.push({
        pathname: '/(tabs)',
        params: toLogParams({
          mealType: payload.mealType,
          mealTiming: payload.mealTiming,
          hoursAfterMeal: payload.hoursAfterMeal,
        }),
      });
    };

    // Cold start: app opened by tapping a notification.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        routeFromPayload(response.notification.request.content.data as ReminderPayload);
      }
    });

    // Warm: tapped while running.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFromPayload(response.notification.request.content.data as ReminderPayload);
    });
    return () => sub.remove();
  }, [router]);

  const bootError = dbError?.message ?? initError;
  if (bootError !== undefined) {
    return <BootError message={bootError} />;
  }

  if (!isDbReady || !isInitialized || !fontsLoaded) {
    return <BootSpinner />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
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

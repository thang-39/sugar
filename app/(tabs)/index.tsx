import type { ReactElement } from 'react';
import { SafeAreaView, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LogReadingForm } from '@/ui/components/log-reading-form';
import { colors } from '@/ui/theme';

export default function LogScreen(): ReactElement {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LogReadingForm />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
});


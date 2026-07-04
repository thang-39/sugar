import { useSettingsStore } from '../use-settings';
import { Unit } from '@/domain/models/unit';
import { Language } from '@/domain/models/settings';
import i18n from '@/i18n';

// Mock the db client module to return a fresh in-memory test database for the settings repository.
jest.mock('@/data/db/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createTestDb } = require('@/test-support/test-db');
  const testDb = createTestDb();
  return {
    getDb: () => testDb,
    initDatabase: () => Promise.resolve(testDb),
  };
});

// Mock i18n changeLanguage to verify it's called
jest.mock('@/i18n', () => ({
  changeLanguage: jest.fn().mockResolvedValue(undefined),
}));

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useSettingsStore.setState({
      preferredUnit: Unit.MgDl,
      preferredLanguage: Language.Vietnamese,
      fastingRange: { low: 70, high: 100 },
      postMealRange: { low: 70, high: 140 },
      alertsEnabled: true,
      onboardingDone: false,
      isInitialized: false,
    });
    jest.clearAllMocks();
  });

  it('initializes settings from the database', async () => {
    const store = useSettingsStore.getState();
    expect(store.isInitialized).toBe(false);

    await useSettingsStore.getState().initialize();

    expect(useSettingsStore.getState().isInitialized).toBe(true);
    expect(useSettingsStore.getState().preferredUnit).toBe(Unit.MgDl);
    expect(useSettingsStore.getState().preferredLanguage).toBe(Language.Vietnamese);
  });

  it('updates setting in state and database', async () => {
    await useSettingsStore.getState().initialize();

    expect(useSettingsStore.getState().preferredUnit).toBe(Unit.MgDl);

    await useSettingsStore.getState().updateSetting('preferredUnit', Unit.MmolL);

    expect(useSettingsStore.getState().preferredUnit).toBe(Unit.MmolL);
  });

  it('triggers language switch in i18n when preferredLanguage setting is updated', async () => {
    await useSettingsStore.getState().initialize();

    await useSettingsStore.getState().updateSetting('preferredLanguage', Language.English);

    expect(useSettingsStore.getState().preferredLanguage).toBe(Language.English);
    expect(i18n.changeLanguage).toHaveBeenCalledWith(Language.English);
  });
});

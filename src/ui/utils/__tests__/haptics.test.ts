import * as Haptics from 'expo-haptics';
import { haptics } from '@/ui/utils/haptics';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('haptics', () => {
  beforeEach(() => jest.clearAllMocks());

  it('success → Success notification', async () => {
    await haptics.success();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  it('warning → Warning notification', async () => {
    await haptics.warning();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('error → Error notification', async () => {
    await haptics.error();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  it('selection → selectionAsync', async () => {
    await haptics.selection();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('never rejects even if the native call throws', async () => {
    (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(new Error('no haptics'));
    await expect(haptics.success()).resolves.toBeUndefined();
  });
});

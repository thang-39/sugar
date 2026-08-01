import { resolveDeviceLanguage } from '../device-language';
import { Language } from '@/domain/models/settings';

/**
 * Rule: a Vietnamese device gets Vietnamese, everything else gets English.
 * Before this existed the app hard-coded Vietnamese for every user on earth,
 * which broke the English-first store listing — someone installing from an
 * English listing opened a Vietnamese app.
 */
describe('resolveDeviceLanguage', () => {
  it('máy tiếng Việt → tiếng Việt', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'vi' }])).toBe(Language.Vietnamese);
  });

  it('máy tiếng Anh → tiếng Anh', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'en' }])).toBe(Language.English);
  });

  it('ngôn ngữ app không hỗ trợ → tiếng Anh', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'fr' }])).toBe(Language.English);
    expect(resolveDeviceLanguage([{ languageCode: 'ja' }])).toBe(Language.English);
  });

  it('chỉ nhìn ngôn ngữ đầu tiên trong danh sách ưu tiên', () => {
    expect(resolveDeviceLanguage([{ languageCode: 'vi' }, { languageCode: 'en' }])).toBe(
      Language.Vietnamese,
    );
  });

  it('không đọc được locale nào → tiếng Anh', () => {
    expect(resolveDeviceLanguage([])).toBe(Language.English);
    expect(resolveDeviceLanguage([{ languageCode: null }])).toBe(Language.English);
  });
});

import * as DocumentPicker from 'expo-document-picker';

import { pickBackupFile } from '@/data/backup/import-backup';

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(uri: string) {
      this.uri = uri;
    }
    text(): string {
      return `contents of ${this.uri}`;
    }
  },
}));

const mockPicked = (uri: string): void => {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri }],
  });
};

describe('pickBackupFile', () => {
  beforeEach(() => jest.clearAllMocks());

  /**
   * Regression (01/08/2026, build #7 trên Android): picker mở với đúng một filter
   * `application/json`, mà Android gán `application/octet-stream` cho chính file app
   * xuất ra khi người dùng lưu nó vào máy từ share sheet → SAF làm mờ file, không
   * khôi phục được. Lọc theo MIME KHÔNG phải cửa kiểm tra — `parseBackup` mới là,
   * và nó đã chặn file lạ bằng lỗi "Not a Sugar backup".
   */
  it('không lọc theo MIME — file backup bị OS gán MIME khác vẫn chọn được', async () => {
    mockPicked('file:///tmp/sugar-backup-2026-08-01.json');

    await pickBackupFile();

    const options = (DocumentPicker.getDocumentAsync as jest.Mock).mock.calls[0][0];
    expect(options.type).toBe('*/*');
  });

  it('trả về nội dung file được chọn', async () => {
    mockPicked('file:///tmp/sugar-backup-2026-08-01.json');

    await expect(pickBackupFile()).resolves.toBe(
      'contents of file:///tmp/sugar-backup-2026-08-01.json',
    );
  });

  it('người dùng huỷ → undefined', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });

    await expect(pickBackupFile()).resolves.toBeUndefined();
  });

  it('không có asset nào → undefined', async () => {
    (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [],
    });

    await expect(pickBackupFile()).resolves.toBeUndefined();
  });
});

import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Open the OS document picker for a JSON backup and return its raw text, or
 * `undefined` if the user cancelled. Pure I/O — parsing / migrating / applying
 * is done by the domain use-cases at the call site, so this module stays free of
 * validation logic.
 *
 * The any-type wildcard is deliberate, NOT laziness. Filtering on `application/json` made
 * restore unusable on Android: the picker becomes `ACTION_OPEN_DOCUMENT` with that
 * single MIME, and the OS greys out every file whose provider reports something
 * else — including the app's OWN export once the user saves it to the device from
 * the share sheet, where it lands as `application/octet-stream`. Files kept in
 * Drive stayed selectable, local ones did not. The MIME filter was never the
 * validation boundary anyway: `parseBackup` rejects anything that isn't a Sugar
 * backup, and `app/backup.tsx` turns that into a "file không hợp lệ" alert.
 */
export async function pickBackupFile(): Promise<string | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return undefined;
  const asset = result.assets[0];
  if (asset === undefined) return undefined;
  return new File(asset.uri).text();
}

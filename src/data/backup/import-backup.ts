import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Open the OS document picker for a JSON backup and return its raw text, or
 * `undefined` if the user cancelled. Pure I/O — parsing / migrating / applying
 * is done by the domain use-cases at the call site, so this module stays free of
 * validation logic.
 */
export async function pickBackupFile(): Promise<string | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return undefined;
  const asset = result.assets[0];
  if (asset === undefined) return undefined;
  return new File(asset.uri).text();
}

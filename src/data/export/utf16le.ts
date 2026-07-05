/**
 * Encode a JS string to UTF-16LE bytes.
 *
 * JS strings are already sequences of UTF-16 code units, so each `charCodeAt`
 * maps to two little-endian bytes (low byte first). A leading U+FEFF therefore
 * becomes the `FF FE` byte-order mark — which is what lets Excel (notably on
 * macOS) detect the encoding and render Vietnamese correctly instead of
 * misreading the file as a legacy 8-bit codepage.
 */
export function encodeUtf16Le(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = code >> 8;
  }
  return bytes;
}

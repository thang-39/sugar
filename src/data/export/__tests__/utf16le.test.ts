import { encodeUtf16Le } from '@/data/export/utf16le';

describe('encodeUtf16Le', () => {
  it('encodes ASCII as low byte then zero high byte (little-endian)', () => {
    expect(Array.from(encodeUtf16Le('A'))).toEqual([0x41, 0x00]);
  });

  it('turns a leading U+FEFF into the UTF-16LE byte-order mark FF FE', () => {
    const bytes = encodeUtf16Le('﻿');
    expect(Array.from(bytes)).toEqual([0xff, 0xfe]);
  });

  it('encodes a Vietnamese code point little-endian (Ă = U+0102)', () => {
    expect(Array.from(encodeUtf16Le('Ă'))).toEqual([0x02, 0x01]);
  });

  it('emits two bytes per UTF-16 code unit', () => {
    expect(encodeUtf16Le('Ăn nhẹ')).toHaveLength('Ăn nhẹ'.length * 2);
  });

  it('returns an empty buffer for an empty string', () => {
    expect(encodeUtf16Le('')).toHaveLength(0);
  });

  it('is reversible: decoding the LE byte pairs restores the original string', () => {
    const source = '﻿Ăn nhẹ\tsáng\r\n120';
    const bytes = encodeUtf16Le(source);
    let decoded = '';
    for (let i = 0; i < bytes.length; i += 2) {
      decoded += String.fromCharCode(bytes[i]! | (bytes[i + 1]! << 8));
    }
    expect(decoded).toBe(source);
  });
});

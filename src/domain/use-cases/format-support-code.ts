/**
 * Turn a raw entitlement id (a UUID in dev, RevenueCat's appUserID from Session 23)
 * into a short, human-readable support code the user can read aloud or copy:
 * `SGR-XXXX-XXXX`. Non-alphanumeric characters are dropped and the result is
 * uppercased; short ids are padded so the shape is always stable.
 */
export function formatSupportCode(rawId: string): string {
  const chars = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const first = chars.slice(0, 4).padEnd(4, '0');
  const second = chars.slice(4, 8).padEnd(4, '0');
  return `SGR-${first}-${second}`;
}

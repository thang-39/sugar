export const MMOL_PER_MGDL = 0.0555;

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Display conversion: stored integer mg/dL → mmol/L rounded to 1 decimal. */
export function mgdlToMmol(mgdl: number): number {
  return roundTo(mgdl * MMOL_PER_MGDL, 1);
}

/** Input conversion: typed mmol/L → nearest integer mg/dL for storage. */
export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol / MMOL_PER_MGDL);
}

export const Unit = {
  MgDl: 'mg/dL',
  MmolL: 'mmol/L',
} as const;

export type Unit = (typeof Unit)[keyof typeof Unit];

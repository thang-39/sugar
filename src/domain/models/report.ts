import type { RangeEvaluation } from './target-range';

/** One measurement cell (before / after / 2h) within a meal column. */
export interface SubCell {
  /** Reading value formatted in the preferred unit. Undefined = no reading (renders "—"). */
  value?: string;
  /** Status; `'none'` when there is no reading. */
  status: RangeEvaluation | 'none';
  /** True when the cell should be flagged out-of-range (low or high). */
  isOutOfRange: boolean;
}

/** One meal column on one day: before-meal + after-meal (+ optional 2h re-check). */
export interface MealCell {
  before: SubCell;
  after: SubCell;
  /** 2h re-check. Empty unless the protocol is 1h+2h AND the 1h reading was out of range. */
  after2h: SubCell;
}

export interface ReportRow {
  /** Localized day label, e.g. "11/07". */
  date: string;
  /** Exactly 3 meal columns: breakfast, lunch, dinner. */
  meals: MealCell[];
}

export interface ReportStats {
  total: number;
  inRange: number;
  /** 0–100, rounded. */
  percentInRange: number;
}

export interface ReportModel {
  rows: ReportRow[];
  stats: ReportStats;
  /** True under the 1h+2h protocol — adds the 2h sub-cell per meal column. */
  hasSecondHour: boolean;
}

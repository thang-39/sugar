import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AfterMealProtocol } from '@/domain/models/condition';
import type { ReadingListFilter, ReadingRepository } from '@/domain/repositories/reading-repository';
import type { TargetRanges } from '@/domain/models/target-range';
import type { Unit } from '@/domain/models/unit';
import { buildReport } from '@/domain/use-cases/build-report';
import { renderReportHtml, type RenderReportHtmlOptions } from './report-html';

export interface GenerateAndSharePdfDeps {
  readingRepo: ReadingRepository;
  filter: ReadingListFilter;
  unit: Unit;
  ranges: TargetRanges;
  protocol: AfterMealProtocol;
  formatValue: (mgdl: number) => string;
  formatDay: (ts: number) => string;
  /** Localized labels + subhead + stats text + optional watermark. */
  html: Omit<RenderReportHtmlOptions, 'subhead' | 'statsText'> & {
    subhead: string;
    statsText: (percentInRange: number, total: number) => string;
  };
}

export const SharePdfStatus = {
  Shared: 'shared',
  Empty: 'empty',
  Unavailable: 'unavailable',
} as const;
export type SharePdfStatus = (typeof SharePdfStatus)[keyof typeof SharePdfStatus];

export interface GenerateAndSharePdfResult {
  status: SharePdfStatus;
  count: number;
}

/**
 * Build the report model, render it to a PDF via expo-print, and open the native
 * share sheet. The report/HTML computation is pure (tested); this performs only
 * the print + share side effects. Callers increment `reportCount` on `Shared`.
 */
export async function generateAndSharePdf(
  deps: GenerateAndSharePdfDeps,
): Promise<GenerateAndSharePdfResult> {
  // Repository lists newest-first; the report reads chronologically.
  const readings = (await deps.readingRepo.list(deps.filter)).slice().reverse();
  if (readings.length === 0) {
    return { status: SharePdfStatus.Empty, count: 0 };
  }

  const model = buildReport(readings, {
    unit: deps.unit,
    ranges: deps.ranges,
    protocol: deps.protocol,
    formatValue: deps.formatValue,
    formatDay: deps.formatDay,
  });

  const html = renderReportHtml(model, {
    title: deps.html.title,
    subhead: deps.html.subhead,
    labels: deps.html.labels,
    statsText: deps.html.statsText(model.stats.percentInRange, model.stats.total),
    watermark: deps.html.watermark,
  });

  const { uri } = await Print.printToFileAsync({ html });

  if (!(await Sharing.isAvailableAsync())) {
    return { status: SharePdfStatus.Unavailable, count: readings.length };
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: deps.html.title,
  });
  return { status: SharePdfStatus.Shared, count: readings.length };
}

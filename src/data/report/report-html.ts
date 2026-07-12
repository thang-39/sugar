import type { MealCell, ReportModel, ReportRow, SubCell } from '@/domain/models/report';

export interface RenderReportHtmlOptions {
  title: string;
  subhead: string;
  labels: {
    date: string;
    breakfast: string;
    lunch: string;
    dinner: string;
    before: string;
    /** After-meal sub-header for the 1h / 2h protocols (single after cell). */
    after: string;
    /** After-meal sub-headers for the 1h+2h protocol. */
    hour1: string;
    hour2: string;
  };
  statsText: string;
  /** Footer watermark; omit to drop it (Pro). */
  watermark?: string;
}

const ROWS_PER_PAGE = 14;

const CELL_BASE = 'border:1px solid #E2EDE7; padding:5px 3px;';
const CELL_OUT = `${CELL_BASE} background:#FDECE4; color:#B23C10; font-weight:800;`;
const TH_BASE =
  'border:1px solid #E2EDE7; padding:5px 3px; font-weight:800; color:#5C6F66; font-size:9px; text-transform:uppercase; letter-spacing:.3px;';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function subCellHtml(cell: SubCell): string {
  const style = cell.isOutOfRange ? CELL_OUT : CELL_BASE;
  const text = cell.value === undefined ? '—' : escapeHtml(cell.value);
  return `<td style="${style}">${text}</td>`;
}

function mealCellsHtml(meal: MealCell, hasSecondHour: boolean): string {
  const cells = hasSecondHour ? [meal.before, meal.after, meal.after2h] : [meal.before, meal.after];
  return cells.map(subCellHtml).join('');
}

function rowHtml(row: ReportRow, hasSecondHour: boolean): string {
  const dateCell = `<td style="${CELL_BASE} color:#5C6F66; font-weight:600;">${escapeHtml(row.date)}</td>`;
  return `<tr>${dateCell}${row.meals.map((meal) => mealCellsHtml(meal, hasSecondHour)).join('')}</tr>`;
}

function headHtml(opts: RenderReportHtmlOptions, hasSecondHour: boolean): string {
  const span = hasSecondHour ? 3 : 2;
  const meals = [opts.labels.breakfast, opts.labels.lunch, opts.labels.dinner];
  const subHeaders = hasSecondHour
    ? [opts.labels.before, opts.labels.hour1, opts.labels.hour2]
    : [opts.labels.before, opts.labels.after];
  const groupTh = meals
    .map((meal) => `<th colspan="${span}" style="${TH_BASE}">${escapeHtml(meal)}</th>`)
    .join('');
  const subTh = meals
    .map(() => subHeaders.map((s) => `<th style="${TH_BASE}">${escapeHtml(s)}</th>`).join(''))
    .join('');
  return `<thead>
      <tr><th rowspan="2" style="${TH_BASE}">${escapeHtml(opts.labels.date)}</th>${groupTh}</tr>
      <tr>${subTh}</tr>
    </thead>`;
}

function pageHtml(rows: ReportRow[], opts: RenderReportHtmlOptions, hasSecondHour: boolean): string {
  return `
    <table data-report-page style="width:100%; border-collapse:collapse; margin-top:12px; font-size:11px; page-break-after:always;">
      ${headHtml(opts, hasSecondHour)}
      <tbody style="text-align:center; font-weight:700;">
        ${rows.map((row) => rowHtml(row, hasSecondHour)).join('')}
      </tbody>
    </table>`;
}

function chunk(rows: readonly ReportRow[], size: number): ReportRow[][] {
  const out: ReportRow[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Render the doctor report model as a self-contained A4 HTML document for
 * expo-print. Pure — no i18n/clock; all labels are injected. Each meal column
 * spans 2 sub-columns (Trước/Sau) or 3 (Trước/1h/2h) under the 1h+2h protocol,
 * driven by `model.hasSecondHour`. Out-of-range cells get a tinted background
 * plus bold text (grayscale-safe when printed).
 */
export function renderReportHtml(model: ReportModel, opts: RenderReportHtmlOptions): string {
  const pages = chunk(model.rows, ROWS_PER_PAGE)
    .map((rows) => pageHtml(rows, opts, model.hasSecondHour))
    .join('');
  const watermark =
    opts.watermark !== undefined
      ? `<div style="font-size:9.5px; font-weight:600; color:#B7C7BE; text-align:center; margin-top:10px;">${escapeHtml(opts.watermark)}</div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, 'Roboto', 'Noto Sans', sans-serif; color: #1B2B24; margin: 0; }
    .title { font-size: 16px; font-weight: 900; text-align: center; }
    .subhead { font-size: 11px; font-weight: 700; color: #5C6F66; text-align: center; margin-top: 4px; }
    .stats { font-size: 13px; font-weight: 700; color: #5C6F66; text-align: center; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="title">${escapeHtml(opts.title)}</div>
  <div class="subhead">${escapeHtml(opts.subhead)}</div>
  ${pages}
  <div class="stats">${escapeHtml(opts.statsText)}</div>
  ${watermark}
</body>
</html>`;
}

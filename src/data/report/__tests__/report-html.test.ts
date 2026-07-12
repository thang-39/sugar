import type { MealCell, ReportModel, SubCell } from '@/domain/models/report';
import { RangeEvaluation } from '@/domain/models/target-range';
import { renderReportHtml, type RenderReportHtmlOptions } from '@/data/report/report-html';

const OPTS: RenderReportHtmlOptions = {
  title: 'Nhật ký đường huyết',
  subhead: 'Tuần thai 28 · Ngưỡng: đói 70–95, sau ăn 70–140',
  labels: {
    date: 'Ngày',
    breakfast: 'Sáng',
    lunch: 'Trưa',
    dinner: 'Tối',
    before: 'Trước',
    after: 'Sau',
    hour1: '1h',
    hour2: '2h',
  },
  statsText: '86% trong ngưỡng · 52 lần đo',
  watermark: 'Tạo bởi app Sugar',
};

const inRange = (value: string): SubCell => ({ value, status: RangeEvaluation.InRange, isOutOfRange: false });
const high = (value: string): SubCell => ({ value, status: RangeEvaluation.High, isOutOfRange: true });
const empty: SubCell = { status: 'none', isOutOfRange: false };

function meal(before: SubCell, after: SubCell, after2h: SubCell = empty): MealCell {
  return { before, after, after2h };
}

function model(rowCount: number, hasSecondHour = false): ReportModel {
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    date: `${String(i + 1).padStart(2, '0')}/07`,
    meals: [
      meal(inRange('88'), high('150'), hasSecondHour ? inRange('110') : empty), // breakfast: 1h high, 2h recovered
      meal(inRange('85'), inRange('130'), empty), // lunch: 1h in range
      meal(empty, empty, empty), // dinner: no readings
    ],
  }));
  return { rows, stats: { total: 52, inRange: 45, percentInRange: 86 }, hasSecondHour };
}

describe('renderReportHtml', () => {
  it('includes the title, subhead and stats text', () => {
    const html = renderReportHtml(model(1), OPTS);
    expect(html).toContain('Nhật ký đường huyết');
    expect(html).toContain('Tuần thai 28');
    expect(html).toContain('86% trong ngưỡng · 52 lần đo');
  });

  it('renders the 3 meal group headers', () => {
    const html = renderReportHtml(model(1), OPTS);
    expect(html).toContain('Sáng');
    expect(html).toContain('Trưa');
    expect(html).toContain('Tối');
  });

  it('shows 2 sub-columns (Trước/Sau) when there is no 2h', () => {
    const html = renderReportHtml(model(1, false), OPTS);
    expect(html).toContain('>Trước<');
    expect(html).toContain('>Sau<');
    expect(html).not.toContain('>2h<');
  });

  it('shows 3 sub-columns (Trước/1h/2h) under the 1h+2h protocol', () => {
    const html = renderReportHtml(model(1, true), OPTS);
    expect(html).toContain('>Trước<');
    expect(html).toContain('>1h<');
    expect(html).toContain('>2h<');
    expect(html).toContain('110'); // the recovered 2h value is rendered
  });

  it('renders an em-dash for empty sub-cells', () => {
    const html = renderReportHtml(model(1), OPTS);
    expect(html).toContain('—'); // dinner column is all empty
  });

  it('applies the out-of-range style to flagged cells only', () => {
    const html = renderReportHtml(model(1), OPTS);
    // The breakfast 1h cell (150) carries the out-of-range background.
    expect(html).toContain('#FDECE4');
    expect(html).toContain('#B23C10');
  });

  it('shows the watermark when provided and omits it when not', () => {
    expect(renderReportHtml(model(1), OPTS)).toContain('Tạo bởi app Sugar');
    const noWatermark = renderReportHtml(model(1), { ...OPTS, watermark: undefined });
    expect(noWatermark).not.toContain('Tạo bởi app Sugar');
  });

  it('chunks rows into pages of 14', () => {
    const html = renderReportHtml(model(30), OPTS);
    // 30 rows → 3 page tables (14 + 14 + 2).
    expect((html.match(/data-report-page/g) ?? []).length).toBe(3);
  });
});

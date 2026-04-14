import { Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import ExcelJS from 'exceljs';
import puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { Period } from '../analytics/period-range';
import {
  deviationYenFromStoredFields,
  taxFreeCardAmountYen,
} from '../calc/daily-report-calc';

function periodLabelJa(p: Period): string {
  switch (p) {
    case 'day':
      return '単日（業務日）';
    case 'week':
      return '週';
    case 'month':
      return '月';
    case 'quarter':
      return '四半期';
    case 'year':
      return '年';
    default:
      return p;
  }
}

function formatJaDate(iso: string): string {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return iso;
  return `${y}年${m}月${d}日`;
}

type SummaryRow = Awaited<
  ReturnType<AnalyticsService['summary']>
>['rows'][number];

type GrandTotalsAgg = {
  totalSalesYen: number;
  taxFreeCardAmountYen: number;
  newageYen: number;
  airpayQrYen: number;
  cashTotalYen: number;
  deviationYen: number;
};

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async exportDailyXlsx(id: string, res: Response) {
    const row = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: { shift: true, createdBy: { select: { username: true } } },
    });
    if (!row) throw new NotFoundException();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('日報');
    ws.columns = [
      { header: '項目', key: 'k', width: 24 },
      { header: '値', key: 'v', width: 40 },
    ];
    const denomById = await this.loadTierDenomById();
    const lines: { k: string; v: string | number }[] = [
      { k: '日付', v: row.reportDate },
      { k: 'シフト', v: row.shiftNameSnapshot },
      { k: '時間帯', v: row.timeRangeLabelSnapshot },
      { k: '責任者', v: row.responsiblePersonSnapshot },
      { k: 'チャージ・ナイト/商品売上', v: `${row.chargeNightPackYen} / ${row.productSalesYen}` },
      { k: '総売上', v: row.totalSalesYen },
      {
        k: '10％クーポン（枚数・面額別）',
        v: this.formatTaxFreeCountsDisplay(
          row.taxFreeCouponCounts,
          denomById,
          row.taxFreeCardAmountYen,
        ),
      },
      { k: '10％クーポン額', v: row.taxFreeCardAmountYen },
      { k: '偏差', v: deviationYenFromStoredFields(row) },
      { k: '偏差理由', v: row.deviationReason ?? '' },
      { k: '提出者', v: row.createdBy.username },
    ];
    lines.forEach((l) => ws.addRow(l));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="daily-${row.reportDate}-${row.shiftNameSnapshot}.xlsx"`,
    );
    await wb.xlsx.write(res);
  }

  async exportDailyPdf(id: string, res: Response) {
    const row = await this.prisma.dailyReport.findUnique({
      where: { id },
      include: { createdBy: { select: { username: true } } },
    });
    if (!row) throw new NotFoundException();

    const denomById = await this.loadTierDenomById();
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>body{font-family:sans-serif} table{border-collapse:collapse;width:100%} td{border:1px solid #333;padding:6px}</style>
</head><body><h2>日報</h2><table>
${[
  ['日付', row.reportDate],
  ['シフト', row.shiftNameSnapshot],
  ['時間帯', row.timeRangeLabelSnapshot],
  ['責任者', row.responsiblePersonSnapshot],
  ['総売上', row.totalSalesYen],
  [
    '10％クーポン（枚数）',
    this.formatTaxFreeCountsDisplay(
      row.taxFreeCouponCounts,
      denomById,
      row.taxFreeCardAmountYen,
    ),
  ],
  ['10％クーポン額', row.taxFreeCardAmountYen],
  ['偏差', deviationYenFromStoredFields(row)],
  ['偏差理由', row.deviationReason ?? ''],
  ['提出者', row.createdBy.username],
]
  .map(
    ([k, v]) =>
      `<tr><td>${escapeHtml(String(k))}</td><td>${escapeHtml(String(v))}</td></tr>`,
  )
  .join('')}
</table></body></html>`;

    const buf = await this.renderPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="daily-${row.reportDate}.pdf"`,
    );
    res.send(buf);
  }

  async exportAggregateXlsx(
    period: Period,
    anchorDate: string,
    res: Response,
  ) {
    const data = await this.analytics.summary(period, anchorDate);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(period === 'day' ? '業務日日報' : '集計');

    if (period === 'day') {
      const registerFloat = await this.getRegisterFloatAmount();
      const denomById = await this.loadTierDenomById();
      const sorted = this.sortRowsByShift(data.rows);
      const gt = this.aggregateGrandTotalsFromRows(data.rows);
      ws.addRow(['業務日（白1 開始日）', data.range.start]);
      ws.addRow(['— 合計（全日・シフト縦表） —', '']);
      for (const [k, v] of this.grandTotalPairs(gt)) {
        ws.addRow([k, v]);
      }
      ws.addRow([]);
      for (const r of sorted) {
        ws.addRow([`【${r.shiftNameSnapshot}】`]);
        for (const [k, v] of this.shiftDetailPairs(r, registerFloat, denomById)) {
          ws.addRow([k, v]);
        }
        ws.addRow([]);
      }
    } else {
      const registerFloat = await this.getRegisterFloatAmount();
      const denomById = await this.loadTierDenomById();
      const gt = this.aggregateGrandTotalsFromRows(data.rows);
      ws.addRow(['集計種別', periodLabelJa(period)]);
      ws.addRow(['期間', `${data.range.start} – ${data.range.end}`]);
      ws.addRow(['— 合計（期間内・縦表） —', '']);
      for (const [k, v] of this.grandTotalPairs(gt)) {
        ws.addRow([k, v]);
      }
      ws.addRow([]);
      ws.addRow(['— 業務日・シフト別明細 —', '']);
      const groups = this.groupRowsByReportDate(data.rows);
      if (groups.length === 0) {
        ws.addRow(['（該当期間の日報がありません）', '']);
      } else {
        for (const [date, list] of groups) {
          ws.addRow([`業務日 ${date}`, '']);
          const sorted = this.sortRowsByShift(list);
          for (const r of sorted) {
            ws.addRow([`  【${r.shiftNameSnapshot}】`, '']);
            for (const [k, v] of this.shiftDetailPairs(r, registerFloat, denomById)) {
              ws.addRow([`    ${k}`, v]);
            }
            ws.addRow([]);
          }
        }
      }
      ws.addRow(['— シフト別合算（縦表） —', '']);
      for (const b of data.byShift) {
        ws.addRow([`【${b.shiftName}】`, '']);
        ws.addRow(['  件数', b.count]);
        ws.addRow(['  総売上', b.totalSalesYen]);
        ws.addRow(['  10％クーポン額', b.taxFreeCardAmountYen]);
        ws.addRow(['  偏差', b.deviationYen]);
        ws.addRow([]);
      }
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="aggregate-${period}-${anchorDate}.xlsx"`,
    );
    await wb.xlsx.write(res);
  }

  async exportAggregatePdf(
    period: Period,
    anchorDate: string,
    res: Response,
  ) {
    const data = await this.analytics.summary(period, anchorDate);
    let html: string;
    if (period === 'day') {
      const registerFloat = await this.getRegisterFloatAmount();
      const denomById = await this.loadTierDenomById();
      const sorted = this.sortRowsByShift(data.rows);
      const gt = this.aggregateGrandTotalsFromRows(data.rows);
      const blocks =
        sorted.length > 0
          ? sorted
              .map((r) =>
                this.businessDayShiftSectionHtml(r, registerFloat, denomById),
              )
              .join('')
          : '<p>（該当業務日の日報がありません）</p>';
      const title = formatJaDate(data.range.start);
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
body{font-family:sans-serif;padding:12px}
h1{font-size:1.25rem}
h2.sub{margin:18px 0 8px;font-size:1.05rem}
h3{font-size:1rem;margin:16px 0 8px;border-bottom:1px solid #333;padding-bottom:4px}
table.vtot,table.shift{border-collapse:collapse;width:100%;max-width:520px;margin-bottom:12px}
table.vtot th,table.vtot td,table.shift td{border:1px solid #333;padding:8px}
table.vtot th{width:42%;text-align:left;background:#f0f0f0;font-weight:600}
table.shift td:first-child{width:38%;background:#f5f5f5}
.note{font-size:12px;color:#555;margin:8px 0 16px}
</style></head><body>
<h1>${escapeHtml(title)} 集計</h1>
<p>業務日（白1 開始日）: <strong>${escapeHtml(data.range.start)}</strong></p>
<h2 class="sub">合計（全日・シフト縦表）</h2>
${this.verticalGrandTotalsTableHtml(gt)}
${blocks ? `<h2 class="sub">シフト別内訳</h2>${blocks}` : ''}
</body></html>`;
    } else {
      const registerFloat = await this.getRegisterFloatAmount();
      const denomById = await this.loadTierDenomById();
      html = this.buildMultiDayPeriodPdfHtml(
        data,
        period,
        registerFloat,
        denomById,
      );
    }
    const buf = await this.renderPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="aggregate-${period}-${anchorDate}.pdf"`,
    );
    res.send(buf);
  }

  private async getRegisterFloatAmount(): Promise<number> {
    const s = await this.prisma.appSettings.findUnique({
      where: { id: 'default' },
    });
    return s?.registerFloatAmount ?? 0;
  }

  private async loadTierDenomById(): Promise<Map<string, number>> {
    const tiers = await this.prisma.taxFreeCardTier.findMany({
      select: { id: true, denominationYen: true },
    });
    return new Map(tiers.map((t) => [t.id, t.denominationYen]));
  }

  /**
   * 枚数行按当前主数据面额展示；若与保存时不一致则并列展示已存 taxFreeCardAmountYen 与按现行主数据重算值。
   */
  private formatTaxFreeCountsDisplay(
    countsJson: unknown,
    denomById: Map<string, number>,
    storedTaxFreeYen?: number,
  ): string {
    if (
      countsJson == null ||
      typeof countsJson !== 'object' ||
      Array.isArray(countsJson)
    ) {
      return '—';
    }
    const c = countsJson as Record<string, unknown>;
    const normalized: Record<string, number> = {};
    const parts: string[] = [];
    for (const [id, raw] of Object.entries(c)) {
      const n =
        typeof raw === 'number' && Number.isFinite(raw)
          ? Math.trunc(raw)
          : parseInt(String(raw), 10);
      if (!Number.isFinite(n) || n < 0) continue;
      normalized[id] = n;
      if (n === 0) continue;
      const den = denomById.get(id);
      parts.push(
        den != null
          ? `${den.toLocaleString('ja-JP')} 円×${n} 枚`
          : `（不明券種）×${n} 枚`,
      );
    }
    const line = parts.length ? parts.join('　') : '—';
    if (storedTaxFreeYen == null) {
      return line;
    }
    const tiersForCalc = [...denomById.entries()].map(
      ([id, denominationYen]) => ({ id, denominationYen }),
    );
    const recalc = taxFreeCardAmountYen(tiersForCalc, normalized);
    if (recalc !== storedTaxFreeYen) {
      return `${line}（※保存済みクーポン額 ${storedTaxFreeYen} 円／現行マスタ再計算 ${recalc} 円）`;
    }
    return line;
  }

  private sortRowsByShift(rows: SummaryRow[]): SummaryRow[] {
    return [...rows].sort((a, b) => a.shift.sortOrder - b.shift.sortOrder);
  }

  /** 按业务日 reportDate 升序分组 */
  private groupRowsByReportDate(rows: SummaryRow[]): [string, SummaryRow[]][] {
    const m = new Map<string, SummaryRow[]>();
    for (const r of rows) {
      const d = r.reportDate;
      if (!m.has(d)) m.set(d, []);
      m.get(d)!.push(r);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  /** 周/月/季/年：区间内按业务日拆分日报样式明细，并做分班次汇总 */
  private buildMultiDayPeriodPdfHtml(
    data: Awaited<ReturnType<AnalyticsService['summary']>>,
    period: Period,
    registerFloat: number,
    denomById: Map<string, number>,
  ): string {
    const groups = this.groupRowsByReportDate(data.rows);
    const dayBlocks =
      groups.length === 0
        ? '<p>（該当期間の日報がありません）</p>'
        : groups
            .map(([date, list]) => {
              const inner = this.sortRowsByShift(list)
                .map((r) =>
                  this.businessDayShiftSectionHtml(r, registerFloat, denomById),
                )
                .join('');
              return `<h2 class="bizday">業務日 ${escapeHtml(date)}</h2>${inner}`;
            })
            .join('');
    const gt = this.aggregateGrandTotalsFromRows(data.rows);
    const rangeTitle =
      data.range.start === data.range.end
        ? formatJaDate(data.range.start)
        : `${formatJaDate(data.range.start)} ～ ${formatJaDate(data.range.end)}`;
    const byShiftVert = this.verticalByShiftSummaryHtml(data.byShift);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
body{font-family:sans-serif;padding:12px}
h1{font-size:1.25rem}
h2.sub{margin:18px 0 8px;font-size:1.05rem}
h2.bizday{font-size:1.05rem;margin:20px 0 8px;border-bottom:2px solid #333;padding-bottom:4px}
h3{font-size:1rem;margin:16px 0 8px;border-bottom:1px solid #333;padding-bottom:4px}
table.vtot,table.shift{border-collapse:collapse;width:100%;max-width:520px;margin-bottom:12px}
table.vtot th,table.vtot td,table.shift td{border:1px solid #333;padding:8px}
table.vtot th{width:42%;text-align:left;background:#f0f0f0;font-weight:600}
table.shift td:first-child{width:38%;background:#f5f5f5}
.note{font-size:12px;color:#555;margin:8px 0 16px}
</style></head><body>
<h1>集計レポート（${escapeHtml(periodLabelJa(period))}）</h1>
<p><strong>期間</strong> ${escapeHtml(data.range.start)} ～ ${escapeHtml(data.range.end)}</p>
<p style="font-size:1.05rem">${escapeHtml(rangeTitle)}</p>
<h2 class="sub">合計（期間内・縦表）</h2>
${this.verticalGrandTotalsTableHtml(gt)}
${dayBlocks}
<h2 class="sub">シフト別合算（縦表）</h2>
${byShiftVert}
</body></html>`;
  }

  private aggregateGrandTotalsFromRows(rows: SummaryRow[]): GrandTotalsAgg {
    let totalSalesYen = 0;
    let taxFreeCardAmountYen = 0;
    let newageYen = 0;
    let airpayQrYen = 0;
    let cashTotalYen = 0;
    let deviationYen = 0;
    for (const r of rows) {
      totalSalesYen += r.totalSalesYen;
      taxFreeCardAmountYen += r.taxFreeCardAmountYen;
      newageYen += r.newageYen;
      airpayQrYen += r.airpayQrYen;
      cashTotalYen += r.cashTotalYen;
      deviationYen += deviationYenFromStoredFields(r);
    }
    return {
      totalSalesYen,
      taxFreeCardAmountYen,
      newageYen,
      airpayQrYen,
      cashTotalYen,
      deviationYen,
    };
  }

  private grandTotalPairs(t: GrandTotalsAgg): [string, string | number][] {
    return [
      ['総売上', `${t.totalSalesYen} 円`],
      ['10％クーポン額', `${t.taxFreeCardAmountYen} 円`],
      ['Newage売上', `${t.newageYen} 円`],
      ['Airpay＋QR売上', `${t.airpayQrYen} 円`],
      ['現金売上', `${t.cashTotalYen} 円`],
      ['偏差値', `${t.deviationYen} 円`],
    ];
  }

  private verticalGrandTotalsTableHtml(t: GrandTotalsAgg): string {
    const rows = this.grandTotalPairs(t)
      .map(
        ([k, v]) =>
          `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`,
      )
      .join('');
    return `<table class="vtot">${rows}</table><p class="note">※現金売上は各日報「現金合計（実点 − 底銭）」の合算です。</p>`;
  }

  private verticalByShiftSummaryHtml(
    byShift: {
      shiftName: string;
      count: number;
      totalSalesYen: number;
      taxFreeCardAmountYen: number;
      deviationYen: number;
    }[],
  ): string {
    if (!byShift.length) return '<p>（シフトデータなし）</p>';
    return byShift
      .map((b) => {
        const rows = [
          ['件数', String(b.count)],
          ['総売上', `${b.totalSalesYen} 円`],
          ['10％クーポン額', `${b.taxFreeCardAmountYen} 円`],
          ['偏差', `${b.deviationYen} 円`],
        ]
          .map(
            ([k, v]) =>
              `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`,
          )
          .join('');
        return `<h3>${escapeHtml(b.shiftName)}</h3><table class="vtot">${rows}</table>`;
      })
      .join('');
  }

  private shiftDetailPairs(
    r: SummaryRow,
    registerFloat: number,
    denomById: Map<string, number>,
  ): [string, string | number][] {
    const cashIn = r.cashTotalYen + registerFloat;
    return [
      ['責任者', r.responsiblePersonSnapshot],
      ['時間帯', r.timeRangeLabelSnapshot],
      ['チャージ・ナイト', `${r.chargeNightPackYen} 円`],
      ['商品売上', `${r.productSalesYen} 円`],
      ['総売上', `${r.totalSalesYen} 円`],
      [
        '10％クーポン（枚数・面額別）',
        this.formatTaxFreeCountsDisplay(
          r.taxFreeCouponCounts,
          denomById,
          r.taxFreeCardAmountYen,
        ),
      ],
      ['10％クーポン額', `${r.taxFreeCardAmountYen} 円`],
      ['Newage', `${r.newageYen} 円`],
      ['Airpay+QR', `${r.airpayQrYen} 円`],
      ['レジ実点（底銭込）', `${cashIn} 円`],
      ['レジ底銭（設定）', `${registerFloat} 円`],
      ['現金合計（実点 − 底銭）', `${r.cashTotalYen} 円`],
      ['偏差', `${deviationYenFromStoredFields(r)} 円`],
      ['偏差理由', r.deviationReason?.trim() || '—'],
      ['提出者', r.createdBy.username],
    ];
  }

  private businessDayShiftSectionHtml(
    r: SummaryRow,
    registerFloat: number,
    denomById: Map<string, number>,
  ): string {
    const rows = this.shiftDetailPairs(r, registerFloat, denomById)
      .map(
        ([k, v]) =>
          `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`,
      )
      .join('');
    return `<h3>${escapeHtml(r.shiftNameSnapshot)}</h3><table class="shift">${rows}</table>`;
  }

  private async renderPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buf = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(buf);
    } finally {
      await browser.close();
    }
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

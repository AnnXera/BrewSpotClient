import { ref } from 'vue'
import type { Cell, Worksheet } from 'exceljs'

// Excel downloads for the Analytics tabs. Each tab describes its sheets; this
// writes them in the Brewspot style under a shared header (cafe, period,
// branches, generated) so every file says what it covers. Values stay raw
// numbers so owners can sum and pivot.

export type ExcelFormat = 'text' | 'count' | 'decimal' | 'peso' | 'percent' | 'date'

export interface ExcelColumn<R> {
    header: string
    value: (row: R) => string | number | null | undefined
    // 'percent' takes 0–100 (as the API sends it); 'date' takes a Y-m-d string.
    format?: ExcelFormat | ((row: R) => ExcelFormat)
    width?: number
    signed?: boolean // a change: shown with +/−, green up, red down
    heat?: boolean   // shaded light to dark by value, like the heatmap on screen
}

export interface ExcelSheet<R = any> {
    name: string
    columns: ExcelColumn<R>[]
    rows: R[]
    totals?: R // bold last row
}

export interface ExcelReport {
    title: string // e.g. "Sales report"
    cafe: string | null
    from: string
    to: string
    scope: string // "All branches" or the branch name
    sheets: ExcelSheet[]
}

// The app's palette, as ARGB.
const C = {
    espresso: 'FF3B1F0E',
    mocha: 'FF7D5A50',
    muted: 'FF8B6656',
    cream: 'FFFDF3E7',
    latte: 'FFF3E7D2',
    band: 'FFFBF4EA',
    line: 'FFEEDFC4',
    white: 'FFFFFFFF',
    up: 'FF2F7D4F',
    down: 'FFA2352A',
    heatLow: 'FFF7EFE5',
    heatHigh: 'FF8E6253',
}

const NUM_FMT: Record<ExcelFormat, string | undefined> = {
    text: undefined,
    count: '#,##0',
    decimal: '#,##0.0',
    peso: '"₱"#,##0.00',
    percent: '0.0%',
    date: 'mmm d, yyyy',
}
const SIGNED_FMT = '+0.0%;-0.0%;0.0%'

const HEADER_ROW = 7 // title, cafe band, period, branches, generated, spacer, then the table

// Midnight UTC, so Excel shows the same calendar day in any time zone.
function excelDate(day: string): Date {
    const [y, m, d] = day.split('-').map(Number)
    return new Date(Date.UTC(y!, m! - 1, d!))
}

function cellValue(raw: string | number | null | undefined, format: ExcelFormat) {
    if (raw === null || raw === undefined || raw === '') return null
    if (format === 'percent' && typeof raw === 'number') return raw / 100
    if (format === 'date' && typeof raw === 'string') return excelDate(raw)
    return raw
}

// Excel sheet names: 31 characters, none of []:*?/\
function sheetName(name: string) {
    return name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)
}

function slug(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function fill(cell: Cell, argb: string) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

// A full-width band across the sheet's columns.
function band(ws: Worksheet, row: number, span: number, text: string, opts: { bg: string; color: string; size: number; bold?: boolean; height: number }) {
    ws.mergeCells(row, 1, row, span)
    const cell = ws.getCell(row, 1)
    cell.value = text
    cell.font = { name: 'Calibri', size: opts.size, bold: opts.bold, color: { argb: opts.color } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    for (let c = 1; c <= span; c++) fill(ws.getCell(row, c), opts.bg)
    ws.getRow(row).height = opts.height
}

function writeSheet(ws: Worksheet, report: ExcelReport, sheet: ExcelSheet, period: string, generated: string) {
    const cols = sheet.columns
    const title = `${report.title}  ·  ${sheet.name}`
    const formatOf = (col: ExcelColumn<any>, row: any): ExcelFormat =>
        typeof col.format === 'function' ? col.format(row) : (col.format ?? 'text')

    // Width from what Excel will show (₱, commas, dates spelled out), not the raw
    // value, plus room for the bold header and the filter arrow.
    const shown = (col: ExcelColumn<any>, row: any) => {
        const raw = col.value(row)
        if (raw === null || raw === undefined) return ''
        const fmt = formatOf(col, row)
        if (typeof raw === 'number') {
            if (fmt === 'peso') return `₱${raw.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            if (fmt === 'percent') return `+${raw.toFixed(1)}%`
            return raw.toLocaleString('en-PH')
        }
        return fmt === 'date' ? 'Sep 30, 2026' : String(raw)
    }
    const allRows = [...sheet.rows, ...(sheet.totals ? [sheet.totals] : [])]
    const widths = cols.map((col, i) => col.width ?? Math.round(Math.min(60, Math.max(
        i === 0 ? 28 : 18,
        col.header.length * 1.2 + 4,
        ...allRows.map(r => shown(col, r).length * 1.1 + 4),
    ))))

    // Merged bands clip their text, so they run across as many columns as the
    // title (16pt) and the meta lines need, adding empty columns if the table is narrow.
    const need = Math.max(title.length * 1.7 + 6, widths[0]! + Math.max(period.length, report.scope.length, generated.length) * 1.1 + 4)
    let span = Math.max(cols.length, 2)
    while (widths.slice(0, span).reduce((a, w) => a + w, 0) < need) {
        if (span >= widths.length) widths.push(18)
        span++
    }
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

    ws.properties.defaultRowHeight = 18
    ws.views = [{ state: 'frozen', ySplit: HEADER_ROW, showGridLines: false }]

    // ── Header block ──
    band(ws, 1, span, title, { bg: C.espresso, color: C.white, size: 16, bold: true, height: 32 })
    band(ws, 2, span, report.cafe ?? 'Brewspot', { bg: C.mocha, color: C.cream, size: 11, height: 20 })
    const meta: [string, string][] = [['Period', period], ['Branches', report.scope], ['Generated', generated]]
    meta.forEach(([label, value], i) => {
        const r = 3 + i
        const l = ws.getCell(r, 1)
        l.value = label
        l.font = { bold: true, size: 10, color: { argb: C.muted } }
        l.alignment = { indent: 1, vertical: 'middle' }
        if (span > 2) ws.mergeCells(r, 2, r, span)
        const v = ws.getCell(r, 2)
        v.value = value
        v.font = { size: 10, color: { argb: C.espresso } }
        v.alignment = { vertical: 'middle' }
        for (let c = 1; c <= span; c++) fill(ws.getCell(r, c), C.cream)
    })
    ws.getRow(6).height = 8

    // ── Table header ──
    const head = ws.getRow(HEADER_ROW)
    head.height = 24
    cols.forEach((col, i) => {
        const cell = head.getCell(i + 1)
        cell.value = col.header
        cell.font = { bold: true, size: 10, color: { argb: C.white } }
        fill(cell, C.mocha)
        const numeric = formatOf(col, sheet.rows[0] ?? {}) !== 'text'
        cell.alignment = { vertical: 'middle', horizontal: numeric ? 'right' : 'left', indent: numeric ? 0 : 1, wrapText: true }
        cell.border = { bottom: { style: 'medium', color: { argb: C.espresso } } }
    })

    // ── Rows ──
    const writeRow = (rowNo: number, row: any, kind: 'data' | 'total', banded: boolean) => {
        const r = ws.getRow(rowNo)
        r.height = kind === 'total' ? 22 : 18
        cols.forEach((col, i) => {
            const fmt = formatOf(col, row)
            const cell = r.getCell(i + 1)
            const value = cellValue(col.value(row), fmt)
            cell.value = value
            const numFmt = col.signed ? SIGNED_FMT : NUM_FMT[fmt]
            if (numFmt) cell.numFmt = numFmt

            const color = col.signed && typeof value === 'number' && value !== 0
                ? (value > 0 ? C.up : C.down)
                : (i === 0 || kind === 'total' ? C.espresso : 'FF3D2B24')
            cell.font = { size: 10, bold: kind === 'total' || i === 0, color: { argb: color } }
            cell.alignment = { vertical: 'middle', horizontal: fmt === 'text' ? 'left' : 'right', indent: fmt === 'text' ? 1 : 0 }

            if (kind === 'total') {
                fill(cell, C.latte)
                cell.border = { top: { style: 'medium', color: { argb: C.mocha } }, bottom: { style: 'thin', color: { argb: C.mocha } } }
            } else {
                if (banded && !col.heat) fill(cell, C.band)
                cell.border = { bottom: { style: 'hair', color: { argb: C.line } } }
            }
        })
    }

    const first = HEADER_ROW + 1
    sheet.rows.forEach((row, i) => writeRow(first + i, row, 'data', i % 2 === 1))
    const last = first + sheet.rows.length - 1

    if (!sheet.rows.length) {
        const r = ws.getCell(first, 1)
        r.value = 'Nothing recorded in this period.'
        r.font = { italic: true, size: 10, color: { argb: C.muted } }
        r.alignment = { indent: 1 }
    }
    if (sheet.totals && sheet.rows.length) writeRow(last + 1, sheet.totals, 'total', false)

    // ── Heat shading over the marked columns ──
    const heatCols = cols.map((c, i) => (c.heat ? i + 1 : 0)).filter(Boolean)
    if (heatCols.length && sheet.rows.length) {
        const a = ws.getCell(first, heatCols[0]!).address
        const b = ws.getCell(last, heatCols[heatCols.length - 1]!).address
        ws.addConditionalFormatting({
            ref: `${a}:${b}`,
            rules: [{ type: 'colorScale', priority: 1, cfvo: [{ type: 'min' }, { type: 'max' }], color: [{ argb: C.heatLow }, { argb: C.heatHigh }] }],
        })
    }

    // ── Widths, filter, print ──
    if (sheet.rows.length) {
        ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: last, column: cols.length } }
    }

    ws.pageSetup = {
        orientation: cols.length > 6 ? 'landscape' : 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: `${HEADER_ROW}:${HEADER_ROW}`,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    }
    ws.headerFooter = { oddFooter: `&L&8${report.cafe ?? 'Brewspot'} · ${report.title}&R&8Page &P of &N` }
}

export function useExcelExport() {
    const exporting = ref(false)

    async function download(report: ExcelReport) {
        exporting.value = true
        try {
            // Loaded on click so exceljs stays out of the page bundle.
            const mod = await import('exceljs')
            const Excel: typeof import('exceljs') = (mod as any).default ?? mod

            const wb = new Excel.Workbook()
            wb.creator = 'Brewspot'
            wb.created = new Date()

            const day = (d: string) => excelDate(d).toLocaleDateString('en-PH', { timeZone: 'UTC', dateStyle: 'medium' })
            const period = report.from === report.to ? day(report.from) : `${day(report.from)} to ${day(report.to)}`
            const generated = new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

            for (const sheet of report.sheets) {
                const ws = wb.addWorksheet(sheetName(sheet.name), { properties: { tabColor: { argb: C.mocha } } })
                writeSheet(ws, report, sheet, period, generated)
            }

            const buffer = await wb.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `brewspot-${slug(report.title)}_${report.from}_${report.to}_${slug(report.scope)}.xlsx`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 1000)
        } finally {
            exporting.value = false
        }
    }

    return { exporting, download }
}

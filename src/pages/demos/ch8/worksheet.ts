import {
  errorRows,
  expSmoothingForecast,
  metricsFrom,
  movingAverageForecast,
  naiveForecast,
} from '../../../lib/forecast'

/**
 * Printable forecasting worksheet in black and white: a dot plot of the
 * demand series to eyeball, plus the demand table with blank Naive,
 * MA(3), and ES(α) forecast columns and blank MAD/MSE/MAPE rows to fill
 * in (or everything filled, for the solutions version). Both versions
 * describe the identical problem.
 *
 * jsPDF is imported lazily so it stays out of the main bundle.
 */
export async function downloadWorksheet(
  demand: number[],
  options: {
    /** the ES smoothing constant currently dialed in on the page */
    alpha: number
    /** fill in every answer instead of leaving blanks */
    solution?: boolean
  },
) {
  const { alpha, solution = false } = options
  const { jsPDF } = await import('jspdf')
  // US Letter, portrait: 612 × 792 pt
  const PAGE_W = 612
  const PAGE_H = 792
  const MARGIN = 48
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })

  const BLACK = 30
  const GRAY = 110
  const LIGHT = 165
  const FAINT = 215

  const T = demand.length
  const methods = [
    { label: 'Naive', forecasts: naiveForecast(demand) },
    { label: 'MA(3)', forecasts: movingAverageForecast(demand, 3) },
    {
      label: `ES (alpha = ${alpha.toFixed(2)})`,
      forecasts: expSmoothingForecast(demand, alpha),
    },
  ]
  const metrics = methods.map((m) => metricsFrom(errorRows(demand, m.forecasts)))

  // ── header ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(BLACK)
  doc.text(
    solution
      ? 'MGSC 395 · Forecasting Worksheet — Solutions'
      : 'MGSC 395 · Forecasting Worksheet',
    MARGIN,
    46,
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRAY)
  doc.text(
    'Error E_t = f_t - d_t · MAD = mean |E_t| · MSE = mean E_t² · MAPE = mean |E_t| / d_t',
    MARGIN,
    62,
  )

  // ── dot plot of the demand series ─────────────────────────
  const plot = { x: MARGIN + 26, y: 84, w: PAGE_W - 2 * MARGIN - 26, h: 150 }
  const dMax = Math.max(...demand, 1)
  const step = (() => {
    const rough = dMax / 4
    const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-9))))
    for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= rough) return m * pow
    return 10 * pow
  })()
  const yTop = Math.ceil(dMax / step) * step
  const px = (t: number) => plot.x + ((t - 1) / Math.max(T - 1, 1)) * plot.w
  const py = (v: number) => plot.y + plot.h - (v / yTop) * plot.h

  doc.setLineWidth(0.5)
  for (let v = 0; v <= yTop; v += step) {
    doc.setDrawColor(v === 0 ? LIGHT : FAINT)
    doc.line(plot.x, py(v), plot.x + plot.w, py(v))
    doc.setFontSize(6.5)
    doc.setTextColor(GRAY)
    doc.text(v.toLocaleString('en-US'), plot.x - 5, py(v) + 2.2, { align: 'right' })
  }
  doc.setFontSize(6.5)
  doc.setTextColor(GRAY)
  for (let t = 1; t <= T; t++) {
    doc.setDrawColor(LIGHT)
    doc.line(px(t), plot.y + plot.h, px(t), plot.y + plot.h + 3)
    doc.text(String(t), px(t), plot.y + plot.h + 11, { align: 'center' })
  }
  doc.text('period', plot.x + plot.w / 2, plot.y + plot.h + 22, { align: 'center' })
  doc.setDrawColor(BLACK)
  for (let t = 1; t <= T; t++) {
    doc.setFillColor(BLACK, BLACK, BLACK)
    doc.circle(px(t), py(demand[t - 1]), 2.4, 'F')
  }

  // ── the table ─────────────────────────────────────────────
  const cols: { label: string; w: number }[] = [
    { label: 'Period', w: 52 },
    { label: 'Demand', w: 64 },
    ...methods.map((m) => ({ label: m.label, w: 110 })),
  ]
  const tableW = cols.reduce((s, c) => s + c.w, 0)
  const tx0 = (PAGE_W - tableW) / 2
  const tableTop = plot.y + plot.h + 44
  // T demand rows + the next-period row + 3 metric rows + the header
  const rowH = Math.min(19, (PAGE_H - MARGIN - tableTop) / (T + 5))

  const colX: number[] = []
  {
    let x = tx0
    for (const c of cols) {
      colX.push(x)
      x += c.w
    }
  }
  const cell = (value: string, col: number, y: number, align: 'left' | 'right' = 'right') => {
    if (!value) return
    if (align === 'right') doc.text(value, colX[col] + cols[col].w - 6, y, { align: 'right' })
    else doc.text(value, colX[col] + 6, y)
  }

  // header row
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(BLACK)
  cols.forEach((c, i) => cell(c.label, i, tableTop + rowH - 6, i === 0 ? 'left' : 'right'))
  doc.setDrawColor(BLACK)
  doc.setLineWidth(0.9)
  doc.line(tx0, tableTop + rowH, tx0 + tableW, tableTop + rowH)

  const fmt1 = (v: number) => v.toFixed(1)

  // demand rows 1..T plus the next-period row T+1
  doc.setFont('helvetica', 'normal')
  for (let t = 1; t <= T + 1; t++) {
    const rowY = tableTop + rowH * t
    doc.setDrawColor(LIGHT)
    doc.setLineWidth(0.5)
    doc.line(tx0, rowY + rowH, tx0 + tableW, rowY + rowH)
    doc.setTextColor(BLACK)
    const textY = rowY + rowH - 6
    cell(t <= T ? String(t) : `${t} (next)`, 0, textY, 'left')
    cell(t <= T ? demand[t - 1].toLocaleString('en-US') : '—', 1, textY)
    methods.forEach((m, i) => {
      const f = m.forecasts[t - 1]
      if (f === null || f === undefined) cell('—', 2 + i, textY)
      else if (solution) cell(fmt1(f), 2 + i, textY)
    })
  }

  // metric rows
  const metricTop = tableTop + rowH * (T + 2)
  doc.setDrawColor(BLACK)
  doc.setLineWidth(0.9)
  doc.line(tx0, metricTop, tx0 + tableW, metricTop)
  doc.setFont('helvetica', 'bold')
  const metricRows: { label: string; fill: (i: number) => string }[] = [
    {
      label: 'MAD',
      fill: (i) => {
        const m = metrics[i]
        return solution && m ? fmt1(m.mad) : ''
      },
    },
    {
      label: 'MSE',
      fill: (i) => {
        const m = metrics[i]
        return solution && m ? Math.round(m.mse).toLocaleString('en-US') : ''
      },
    },
    {
      label: 'MAPE',
      fill: (i) => {
        const m = metrics[i]
        return solution && m && m.mape !== null ? `${fmt1(m.mape)}%` : ''
      },
    },
  ]
  metricRows.forEach((row, r) => {
    const rowY = metricTop + rowH * r
    doc.setDrawColor(LIGHT)
    doc.setLineWidth(0.5)
    doc.line(tx0, rowY + rowH, tx0 + tableW, rowY + rowH)
    doc.setTextColor(BLACK)
    const textY = rowY + rowH - 6
    cell(row.label, 0, textY, 'left')
    methods.forEach((_, i) => cell(row.fill(i), 2 + i, textY))
  })

  // vertical rules
  const tableBottom = metricTop + rowH * 3
  doc.setDrawColor(LIGHT)
  doc.setLineWidth(0.5)
  let vx = tx0
  for (const c of [...cols, { w: 0 }]) {
    doc.line(vx, tableTop + 2, vx, tableBottom)
    vx += c.w
  }

  doc.save(
    solution ? 'forecasting-worksheet-solutions.pdf' : 'forecasting-worksheet.pdf',
  )
}

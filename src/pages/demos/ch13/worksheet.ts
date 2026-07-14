import {
  GRID_MAX_X,
  GRID_MAX_Y,
  centerOfGravity,
  distance,
  loadDistance,
  round1,
  totalLoad,
  type CustomerInput,
  type DistanceMetric,
} from '../../../lib/cog'

/**
 * Printable facility-location worksheet in black and white: the grid map
 * with the customers plotted and labeled, plus the customer table with
 * x/y/load filled in and blank relative-load, distance, load-distance,
 * and center-of-gravity cells to write in (or everything filled in, for
 * the solutions version). Both versions describe the identical problem.
 *
 * jsPDF is imported lazily so it stays out of the main bundle.
 */
export async function downloadWorksheet(
  customers: CustomerInput[],
  options: {
    metric?: DistanceMetric
    /** fill in every answer instead of leaving blanks */
    solution?: boolean
  } = {},
) {
  const { metric = 'rectilinear', solution = false } = options
  const { jsPDF } = await import('jspdf')
  // US Letter, landscape: 792 × 612 pt
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const PAGE_W = 792
  const PAGE_H = 612
  const MARGIN = 40

  const BLACK = 30
  const GRAY = 110
  const LIGHT = 165
  const FAINT = 215

  const total = totalLoad(customers)
  const cgRaw = centerOfGravity(customers)
  // the class convention: round the CG to one decimal before scoring
  const cg = cgRaw ? { x: round1(cgRaw.x), y: round1(cgRaw.y) } : null
  const ldScore = cg ? loadDistance(customers, cg, metric) : null

  // ── header ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(BLACK)
  doc.text(
    solution
      ? 'MGSC 395 · Facility Location Worksheet — Solutions'
      : 'MGSC 395 · Facility Location Worksheet',
    MARGIN,
    46,
  )
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(GRAY)
  doc.text(
    `Distance: ${
      metric === 'rectilinear'
        ? 'rectilinear (city blocks)'
        : 'Euclidean (straight line)'
    } · LD score = sum of (load × distance to the center of gravity)`,
    MARGIN,
    62,
  )

  // ── grid map (left) ───────────────────────────────────────
  const map = { x: MARGIN, y: 84, w: 400, h: 320 }
  const unit = Math.min(map.w / GRID_MAX_X, map.h / GRID_MAX_Y) // 20 pt per unit
  const px = (x: number) => map.x + x * unit
  const py = (y: number) => map.y + (GRID_MAX_Y - y) * unit

  doc.setLineWidth(0.5)
  for (let i = 0; i <= GRID_MAX_X; i++) {
    doc.setDrawColor(i === 0 ? LIGHT : FAINT)
    doc.line(px(i), py(GRID_MAX_Y), px(i), py(0))
  }
  for (let i = 0; i <= GRID_MAX_Y; i++) {
    doc.setDrawColor(i === 0 ? LIGHT : FAINT)
    doc.line(px(0), py(i), px(GRID_MAX_X), py(i))
  }
  doc.setFontSize(6.5)
  doc.setTextColor(GRAY)
  for (let t = 0; t <= GRID_MAX_X; t += 2) {
    doc.text(String(t), px(t), py(0) + 10, { align: 'center' })
  }
  for (let t = 0; t <= GRID_MAX_Y; t += 2) {
    doc.text(String(t), px(0) - 5, py(t) + 2.2, { align: 'right' })
  }

  // customers — area-scaled circles, biggest first so labels stay legible
  const maxLoad = Math.max(...customers.map((c) => c.load), 1)
  const MAX_R = 14
  const MIN_R = 2
  const rFor = (load: number) =>
    Math.max(MIN_R, MAX_R * Math.sqrt(Math.max(load, 0) / maxLoad))
  const drawOrder = [...customers].sort((a, b) => b.load - a.load)
  for (const c of drawOrder) {
    const r = rFor(c.load)
    doc.setDrawColor(BLACK)
    doc.setLineWidth(0.8)
    doc.setFillColor(238, 238, 238)
    doc.circle(px(c.x), py(c.y), r, 'FD')
    doc.setFillColor(BLACK, BLACK, BLACK)
    doc.circle(px(c.x), py(c.y), 1, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(BLACK)
    const above = py(c.y) - r - 3 > map.y + 8
    doc.text(
      c.name.length > 22 ? c.name.slice(0, 21) + '…' : c.name,
      px(c.x),
      above ? py(c.y) - r - 3 : py(c.y) + r + 8,
      { align: 'center' },
    )
  }
  doc.setFontSize(6.5)
  doc.setTextColor(GRAY)
  doc.text('Circle area is proportional to load.', map.x, map.y + map.h + 24)

  // solutions: mark the center of gravity with a crosshair
  if (solution && cg) {
    const cx = px(cg.x)
    const cy = py(cg.y)
    doc.setDrawColor(BLACK)
    doc.setLineWidth(1.2)
    doc.line(cx - 8, cy, cx + 8, cy)
    doc.line(cx, cy - 8, cx, cy + 8)
    doc.circle(cx, cy, 4.5, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(BLACK)
    doc.text(`CG (${cg.x.toFixed(1)}, ${cg.y.toFixed(1)})`, cx + 11, cy + 2.5)
    doc.setFont('helvetica', 'normal')
  }

  // ── customer table (right) ────────────────────────────────
  const distHeader = metric === 'rectilinear' ? 'Rect. dist' : 'Eucl. dist'
  const cols: {
    label: string
    w: number
    align: 'left' | 'right'
    fill: (c: CustomerInput) => string
  }[] = [
    {
      label: 'Location',
      w: 72,
      align: 'left',
      fill: (c) => (c.name.length > 19 ? c.name.slice(0, 18) + '…' : c.name),
    },
    {
      label: 'Load',
      w: 44,
      align: 'right',
      fill: (c) => c.load.toLocaleString('en-US'),
    },
    {
      label: '%',
      w: 28,
      align: 'right',
      fill: (c) =>
        solution && total > 0 ? ((c.load / total) * 100).toFixed(1) + '%' : '',
    },
    { label: 'x', w: 16, align: 'right', fill: (c) => String(c.x) },
    { label: 'y', w: 16, align: 'right', fill: (c) => String(c.y) },
    {
      label: distHeader,
      w: 48,
      align: 'right',
      fill: (c) =>
        solution && cg ? distance(metric, c, cg).toFixed(1) : '',
    },
    {
      label: 'Load × dist',
      w: 58,
      align: 'right',
      fill: (c) =>
        solution && cg
          ? Math.round(c.load * distance(metric, c, cg)).toLocaleString('en-US')
          : '',
    },
  ]
  const tableW = cols.reduce((s, c) => s + c.w, 0)
  const tx0 = PAGE_W - MARGIN - tableW
  const tableTop = map.y
  const rowH = Math.min(20, (PAGE_H - 150 - tableTop) / (customers.length + 2))

  const cellText = (value: string, x: number, w: number, y: number, align: 'left' | 'right') => {
    if (!value) return
    if (align === 'right') doc.text(value, x + w - 4, y, { align: 'right' })
    else doc.text(value, x + 4, y)
  }

  // header row
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(BLACK)
  let hx = tx0
  for (const c of cols) {
    cellText(c.label, hx, c.w, tableTop + rowH - 6, c.align)
    hx += c.w
  }
  doc.setDrawColor(BLACK)
  doc.setLineWidth(0.9)
  doc.line(tx0, tableTop + rowH, tx0 + tableW, tableTop + rowH)

  // customer rows
  doc.setFont('helvetica', 'normal')
  customers.forEach((c, i) => {
    const rowY = tableTop + rowH * (i + 1)
    doc.setDrawColor(LIGHT)
    doc.setLineWidth(0.5)
    doc.line(tx0, rowY + rowH, tx0 + tableW, rowY + rowH)
    doc.setTextColor(BLACK)
    let colX = tx0
    for (const col of cols) {
      cellText(col.fill(c), colX, col.w, rowY + rowH - 6, col.align)
      colX += col.w
    }
  })

  // total row
  const totalY = tableTop + rowH * (customers.length + 1)
  doc.setDrawColor(BLACK)
  doc.setLineWidth(0.9)
  doc.line(tx0, totalY, tx0 + tableW, totalY)
  doc.setFont('helvetica', 'bold')
  const totalCells = [
    'Total',
    total.toLocaleString('en-US'),
    solution ? '100.0%' : '',
    '',
    '',
    '',
    solution && ldScore !== null
      ? Math.round(ldScore).toLocaleString('en-US')
      : '',
  ]
  let tcx = tx0
  cols.forEach((col, i) => {
    cellText(totalCells[i], tcx, col.w, totalY + rowH - 6, col.align)
    tcx += col.w
  })
  doc.setDrawColor(LIGHT)
  doc.setLineWidth(0.5)
  doc.line(tx0, totalY + rowH, tx0 + tableW, totalY + rowH)

  // vertical rules
  doc.setDrawColor(LIGHT)
  doc.setLineWidth(0.5)
  let vx = tx0
  for (const col of [...cols, { w: 0 }]) {
    doc.line(vx, tableTop + 2, vx, totalY + rowH)
    vx += col.w
  }

  // ── answer lines under the table ──────────────────────────
  const blank = (x: number, y: number, w: number) => {
    doc.setDrawColor(GRAY)
    doc.setLineWidth(0.7)
    doc.line(x, y + 2, x + w, y + 2)
  }
  let ay = totalY + rowH + 30
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(BLACK)
  doc.text('Center of gravity:', tx0, ay)
  doc.setFont('helvetica', solution ? 'bold' : 'normal')
  doc.text('x =', tx0 + 92, ay)
  if (solution && cg) doc.text(cg.x.toFixed(1), tx0 + 110, ay)
  else blank(tx0 + 110, ay, 44)
  doc.text('y =', tx0 + 172, ay)
  if (solution && cg) doc.text(cg.y.toFixed(1), tx0 + 190, ay)
  else blank(tx0 + 190, ay, 44)

  ay += 26
  doc.setFont('helvetica', 'bold')
  doc.text('LD score at the CG:', tx0, ay)
  doc.setFont('helvetica', solution ? 'bold' : 'normal')
  if (solution && ldScore !== null) {
    doc.text(Math.round(ldScore).toLocaleString('en-US'), tx0 + 110, ay)
  } else {
    blank(tx0 + 110, ay, 80)
  }

  doc.save(
    solution
      ? 'facility-location-worksheet-solutions.pdf'
      : 'facility-location-worksheet.pdf',
  )
}

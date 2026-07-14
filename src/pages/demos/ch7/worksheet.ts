import type { ActivityInput } from '../../../lib/cpm'
import { layoutNetwork } from '../../../lib/cpm'

/**
 * Black-and-white printable CPM worksheet: the project network with blank
 * EST/EFT/LST/LFT cells, a schedule table with the answer columns empty,
 * and blanks for the project duration and critical path. Students print it
 * (or write on a tablet) and run the forward and backward games by hand.
 *
 * jsPDF is imported lazily so it stays out of the main bundle.
 */
export async function downloadWorksheet(activities: ActivityInput[]) {
  const { jsPDF } = await import('jspdf')
  // US Letter, landscape: 792 × 612 pt
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const PAGE_W = 792
  const MARGIN = 40

  const BLACK = 30
  const LIGHT = 150

  // ── header ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(BLACK)
  doc.text('MGSC 395 · Critical Path Worksheet', MARGIN, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90)
  doc.text(
    "Forward game: EST = MAX of predecessors' EFTs; EFT = EST + time.   Backward game: LFT = MIN of successors' LSTs; LST = LFT - time.   Slack = LFT - EFT.",
    MARGIN,
    62,
  )

  // ── network diagram ───────────────────────────────────────
  const layout = layoutNetwork(activities)
  const region = { x: MARGIN, y: 76, w: PAGE_W - 2 * MARGIN, h: 250 }
  const scale = Math.min(region.w / layout.width, region.h / layout.height)
  const ox = region.x + (region.w - layout.width * scale) / 2
  const oy = region.y + (region.h - layout.height * scale) / 2
  const px = (x: number) => ox + x * scale
  const py = (y: number) => oy + y * scale

  const NODE_W = 92 * scale
  const NODE_H = 62 * scale
  const PILL_W = 70 * scale
  const PILL_H = 34 * scale

  const centerOf = (id: string) =>
    id === 'START' ? layout.start : id === 'FINISH' ? layout.finish : layout.pos[id]
  const halfW = (id: string) => (id === 'START' || id === 'FINISH' ? PILL_W / 2 : NODE_W / 2)

  const hasSuccessor = new Set(activities.flatMap((a) => a.predecessors))

  // arrows first, so nodes sit on top
  const edges: { from: string; to: string }[] = []
  for (const a of activities) {
    if (a.predecessors.length === 0) edges.push({ from: 'START', to: a.id })
    for (const p of a.predecessors) edges.push({ from: p, to: a.id })
    if (!hasSuccessor.has(a.id)) edges.push({ from: a.id, to: 'FINISH' })
  }
  doc.setDrawColor(BLACK)
  doc.setLineWidth(0.9)
  for (const e of edges) {
    const c1 = centerOf(e.from)
    const c2 = centerOf(e.to)
    const x1 = px(c1.x) + halfW(e.from)
    const y1 = py(c1.y)
    const x2 = px(c2.x) - halfW(e.to)
    const y2 = py(c2.y)
    doc.line(x1, y1, x2, y2)
    // arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const size = 5
    doc.setFillColor(BLACK, BLACK, BLACK)
    doc.triangle(
      x2,
      y2,
      x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45),
      x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45),
      'F',
    )
  }

  // Start / Finish pills
  for (const [at, label] of [
    [layout.start, 'Start'],
    [layout.finish, 'Finish'],
  ] as const) {
    doc.setDrawColor(BLACK)
    doc.setLineWidth(1.1)
    doc.roundedRect(px(at.x) - PILL_W / 2, py(at.y) - PILL_H / 2, PILL_W, PILL_H, PILL_H / 2, PILL_H / 2, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(BLACK)
    doc.text(label, px(at.x), py(at.y) + 2.5, { align: 'center' })
  }

  // activity nodes with blank corner cells
  for (const a of activities) {
    const cx = px(layout.pos[a.id].x)
    const cy = py(layout.pos[a.id].y)
    doc.setDrawColor(BLACK)
    doc.setLineWidth(1)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(cx - NODE_W / 2, cy - NODE_H / 2, NODE_W, NODE_H, 6 * scale, 6 * scale, 'FD')
    // four blank cells
    const cellW = 26 * scale
    const cellH = 12 * scale
    doc.setDrawColor(LIGHT)
    doc.setLineWidth(0.6)
    for (const [dx, dy] of [
      [-28, -21],
      [28, -21],
      [-28, 21],
      [28, 21],
    ]) {
      doc.rect(cx + dx * scale - cellW / 2, cy + dy * scale - cellH / 2, cellW, cellH, 'S')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(BLACK)
    doc.text(a.id, cx - 4 * scale, cy + 3.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(90)
    doc.text(`${a.duration} wk`, cx + 6 * scale, cy + 3.5)
  }

  // corner-cell key
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(90)
  doc.text('Node corners:  EST (top-left)   EFT (top-right)   LST (bottom-left)   LFT (bottom-right)', MARGIN, region.y + region.h + 14)

  // ── schedule table ────────────────────────────────────────
  const tableTop = region.y + region.h + 28
  const cols = [
    { label: 'Activity', w: 58, fill: (a: ActivityInput) => a.id },
    { label: 'Predecessors', w: 96, fill: (a: ActivityInput) => (a.predecessors.length ? a.predecessors.join(', ') : '—') },
    { label: 'Time (wks)', w: 66, fill: (a: ActivityInput) => String(a.duration) },
    { label: 'EST', w: 62, fill: () => '' },
    { label: 'EFT', w: 62, fill: () => '' },
    { label: 'LST', w: 62, fill: () => '' },
    { label: 'LFT', w: 62, fill: () => '' },
    { label: 'Slack', w: 62, fill: () => '' },
    { label: 'Critical?', w: 62, fill: () => '' },
  ]
  const tableW = cols.reduce((s, c) => s + c.w, 0)
  const rowH = Math.min(19, (612 - 58 - tableTop) / (activities.length + 1))
  const tx0 = MARGIN

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(BLACK)
  let cxPos = tx0
  for (const c of cols) {
    doc.text(c.label, cxPos + 4, tableTop + rowH - 6)
    cxPos += c.w
  }
  doc.setDrawColor(BLACK)
  doc.setLineWidth(0.9)
  doc.line(tx0, tableTop + rowH, tx0 + tableW, tableTop + rowH)

  doc.setFont('helvetica', 'normal')
  activities.forEach((a, i) => {
    const rowY = tableTop + rowH * (i + 1)
    doc.setDrawColor(LIGHT)
    doc.setLineWidth(0.5)
    doc.line(tx0, rowY + rowH, tx0 + tableW, rowY + rowH)
    doc.setTextColor(BLACK)
    let colX = tx0
    for (const c of cols) {
      const value = c.fill(a)
      if (value) doc.text(value, colX + 4, rowY + rowH - 6)
      colX += c.w
    }
  })
  // vertical rules
  doc.setDrawColor(LIGHT)
  doc.setLineWidth(0.5)
  let vx = tx0
  for (const c of [...cols, { w: 0 }]) {
    doc.line(vx, tableTop + 2, vx, tableTop + rowH * (activities.length + 1))
    vx += c.w
  }

  // ── answer blanks ─────────────────────────────────────────
  const blanksY = tableTop + rowH * (activities.length + 1) + 26
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BLACK)
  doc.text('Project duration: ________ weeks', MARGIN, blanksY)
  doc.text('Critical path:  Start → ______________________________ → Finish', MARGIN + 220, blanksY)

  doc.save('cpm-worksheet.pdf')
}

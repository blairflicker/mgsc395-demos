import type { ActivityInput, LayoutPoint } from '../../../lib/cpm'
import { computeCpm, layoutNetwork } from '../../../lib/cpm'

/**
 * Printable CPM worksheet in black and white: the project network with the
 * four scheduling values left as open space to write in (or filled in, for
 * the solutions version), a "how to read a node" key, and a centered
 * schedule table. Node positions follow the on-screen arrangement,
 * including any boxes the user dragged.
 *
 * jsPDF is imported lazily so it stays out of the main bundle.
 */
export async function downloadWorksheet(
  activities: ActivityInput[],
  options: {
    /** user-dragged node centers from the on-screen network */
    positions?: Record<string, LayoutPoint>
    /** fill in every answer instead of leaving blanks */
    solution?: boolean
  } = {},
) {
  const { positions = {}, solution = false } = options
  const { jsPDF } = await import('jspdf')
  // US Letter, landscape: 792 × 612 pt
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const PAGE_W = 792
  const MARGIN = 40

  const BLACK = 30
  const GRAY = 110
  const LIGHT = 165

  const schedule = solution ? computeCpm(activities) : null

  // ── header ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(BLACK)
  doc.text(
    solution
      ? 'MGSC 395 · Critical Path Worksheet — Solutions'
      : 'MGSC 395 · Critical Path Worksheet',
    MARGIN,
    46,
  )

  // ── "how to read a node" key (top right) ──────────────────
  const KEY_W = 96
  const KEY_H = 60
  const keyX = PAGE_W - MARGIN - KEY_W
  const keyY = 26
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(GRAY)
  doc.text('How to read a node:', keyX - 8, keyY + KEY_H / 2 + 3, { align: 'right' })
  doc.setDrawColor(GRAY)
  doc.setLineWidth(0.9)
  doc.roundedRect(keyX, keyY, KEY_W, KEY_H, 7, 7, 'S')
  doc.setFontSize(7)
  doc.text('EST', keyX + 6, keyY + 12)
  doc.text('EFT', keyX + KEY_W - 6, keyY + 12, { align: 'right' })
  doc.text('LST', keyX + 6, keyY + KEY_H - 6)
  doc.text('LFT', keyX + KEY_W - 6, keyY + KEY_H - 6, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Activity', keyX + KEY_W / 2, keyY + KEY_H / 2 - 1, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('weeks', keyX + KEY_W / 2, keyY + KEY_H / 2 + 8, { align: 'center' })

  // ── network diagram ───────────────────────────────────────
  const base = layoutNetwork(activities)
  const layout = {
    ...base,
    pos: Object.fromEntries(
      activities.map((a) => [a.id, positions[a.id] ?? base.pos[a.id]]),
    ),
  }
  const region = { x: MARGIN, y: 96, w: PAGE_W - 2 * MARGIN, h: 264 }
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
  const halfH = (id: string) => (id === 'START' || id === 'FINISH' ? PILL_H / 2 : NODE_H / 2)

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
    // vertically stacked ACTIVITY nodes connect top-to-bottom; pill edges
    // always run horizontally (matches the on-screen network)
    const vertical =
      e.from !== 'START' && e.to !== 'FINISH' && Math.abs(c2.x - c1.x) * scale < 40 * scale
    const up = c2.y < c1.y
    const backwards = !vertical && c2.x < c1.x
    const x1 = vertical ? px(c1.x) : px(c1.x) + (backwards ? -halfW(e.from) : halfW(e.from))
    const y1 = vertical ? py(c1.y) + (up ? -halfH(e.from) : halfH(e.from)) : py(c1.y)
    const x2 = vertical ? px(c2.x) : px(c2.x) + (backwards ? halfW(e.to) : -halfW(e.to))
    const y2 = vertical ? py(c2.y) + (up ? halfH(e.to) : -halfH(e.to)) : py(c2.y)
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

  // activity nodes: letter over duration, corners left open (worksheet) or
  // filled with EST/EFT/LST/LFT (solutions, critical nodes drawn heavier)
  for (const a of activities) {
    const cx = px(layout.pos[a.id].x)
    const cy = py(layout.pos[a.id].y)
    const scheduled = schedule?.byId[a.id]
    const critical = !!scheduled?.critical
    doc.setDrawColor(BLACK)
    doc.setLineWidth(critical ? 2.2 : 1)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(cx - NODE_W / 2, cy - NODE_H / 2, NODE_W, NODE_H, 6 * scale, 6 * scale, 'FD')
    if (scheduled) {
      const inX = 39 * scale
      const topY = cy - 12 * scale
      const botY = cy + 28 * scale
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(BLACK)
      doc.text(String(scheduled.est), cx - inX, topY)
      doc.text(String(scheduled.eft), cx + inX, topY, { align: 'right' })
      doc.text(String(scheduled.lst), cx - inX, botY)
      doc.text(String(scheduled.lft), cx + inX, botY, { align: 'right' })
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(BLACK)
    doc.text(a.id, cx, cy + 1, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(90)
    doc.text(String(a.duration), cx, cy + 9, { align: 'center' })
  }

  // ── schedule table (centered) ─────────────────────────────
  const tableTop = region.y + region.h + 18
  const cols = [
    { label: 'Activity', w: 58, fill: (a: ActivityInput) => a.id },
    { label: 'Predecessors', w: 96, fill: (a: ActivityInput) => (a.predecessors.length ? a.predecessors.join(', ') : '—') },
    { label: 'Time (wks)', w: 66, fill: (a: ActivityInput) => String(a.duration) },
    { label: 'EST', w: 62, fill: (a: ActivityInput) => (schedule ? String(schedule.byId[a.id].est) : '') },
    { label: 'EFT', w: 62, fill: (a: ActivityInput) => (schedule ? String(schedule.byId[a.id].eft) : '') },
    { label: 'LST', w: 62, fill: (a: ActivityInput) => (schedule ? String(schedule.byId[a.id].lst) : '') },
    { label: 'LFT', w: 62, fill: (a: ActivityInput) => (schedule ? String(schedule.byId[a.id].lft) : '') },
    { label: 'Slack', w: 62, fill: (a: ActivityInput) => (schedule ? String(schedule.byId[a.id].slack) : '') },
    { label: 'Critical?', w: 62, fill: (a: ActivityInput) => (schedule?.byId[a.id].critical ? 'yes' : '') },
  ]
  const tableW = cols.reduce((s, c) => s + c.w, 0)
  const rowH = Math.min(19, (612 - 36 - tableTop) / (activities.length + 1))
  const tx0 = (PAGE_W - tableW) / 2

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(BLACK)
  let headerX = tx0
  for (const c of cols) {
    doc.text(c.label, headerX + 4, tableTop + rowH - 6)
    headerX += c.w
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

  doc.save(solution ? 'cpm-worksheet-solutions.pdf' : 'cpm-worksheet.pdf')
}

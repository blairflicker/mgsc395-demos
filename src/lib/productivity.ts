/**
 * Chapter 1 productivity — the transformation model, pure computation.
 *
 * A transformation is one output produced from any number of inputs, each
 * classified as labor, materials, or overhead. Every row carries a
 * quantity, a unit name, and optionally a dollars-per-unit value, and can
 * be *shown* either in its native units or in dollars. Productivity is
 * always output over input:
 * - If every input shown counts in dollars, the denominator sums and the
 *   ratio simplifies (class factory: 7,040 units / $3,520 = 2.0 units per
 *   input $; with the output in dollars, $14,080 / $3,520 = 4.0).
 * - A single input simplifies even in native units (class carpet crew:
 *   720 sq yd / 32 labor-hours = 22.5 sq yd per labor-hour, or $5,760 /
 *   32 = $180 per labor-hour).
 * - Mixed units don't simplify — the fraction itself is the productivity.
 */

export type InputKind = 'labor' | 'materials' | 'overhead'

export interface InputRow {
  /** stable key */
  id: string
  name: string
  kind: InputKind
  qty: number
  /** unit name, e.g. "lb", "labor-hours", "month" */
  unit: string
  /** $ per unit; null when the input has no dollar figure */
  dollarsPerUnit: number | null
  /** show this row in dollars (needs dollarsPerUnit) instead of units */
  showDollars: boolean
}

export interface OutputRow {
  name: string
  qty: number
  unit: string
  dollarsPerUnit: number | null
  showDollars: boolean
}

export interface Transformation {
  output: OutputRow
  inputs: InputRow[]
}

/** The factory problem from the Chapter 1 slides (monthly figures). */
export const CLASS_CASE: Transformation = {
  output: { name: 'Widgets', qty: 7040, unit: 'units', dollarsPerUnit: 2, showDollars: false },
  inputs: [
    { id: 'c1', name: 'Labor', kind: 'labor', qty: 1, unit: 'month', dollarsPerUnit: 1000, showDollars: true },
    { id: 'c2', name: 'Materials', kind: 'materials', qty: 1, unit: 'month', dollarsPerUnit: 520, showDollars: true },
    { id: 'c3', name: 'Overhead', kind: 'overhead', qty: 1, unit: 'month', dollarsPerUnit: 2000, showDollars: true },
  ],
}

/** qty × $/unit, or null when the row has no dollar figure */
export const totalDollars = (row: {
  qty: number
  dollarsPerUnit: number | null
}): number | null => (row.dollarsPerUnit === null ? null : row.qty * row.dollarsPerUnit)

interface Template {
  output: OutputRow
  inputs: Omit<InputRow, 'id'>[]
}

/** jitter a quantity ±30%, rounded to a clean value near its magnitude */
const jitter = (v: number): number => {
  const raw = v * (0.7 + Math.random() * 0.6)
  const pow = Math.pow(10, Math.max(0, Math.floor(Math.log10(raw)) - 1))
  return Math.max(1, Math.round(raw / pow) * pow)
}

const TEMPLATES: Template[] = [
  {
    // the class single-factor story: a crew with hours but no wage given
    output: { name: 'Carpet', qty: 720, unit: 'sq yd', dollarsPerUnit: 8, showDollars: false },
    inputs: [
      { name: 'Installer labor', kind: 'labor', qty: 32, unit: 'labor-hours', dollarsPerUnit: null, showDollars: false },
    ],
  },
  {
    output: { name: 'Bread', qty: 1200, unit: 'loaves', dollarsPerUnit: 4.5, showDollars: false },
    inputs: [
      { name: 'Flour', kind: 'materials', qty: 800, unit: 'lb', dollarsPerUnit: 0.4, showDollars: false },
      { name: 'Bakers', kind: 'labor', qty: 160, unit: 'hours', dollarsPerUnit: 18, showDollars: false },
      { name: 'Oven & rent', kind: 'overhead', qty: 1, unit: 'month', dollarsPerUnit: 900, showDollars: true },
    ],
  },
  {
    output: { name: 'Precast panels', qty: 40, unit: 'panels', dollarsPerUnit: 250, showDollars: false },
    inputs: [
      { name: 'Concrete', kind: 'materials', qty: 7000, unit: 'lb', dollarsPerUnit: 0.05, showDollars: false },
      { name: 'Crew', kind: 'labor', qty: 90, unit: 'hours', dollarsPerUnit: 25, showDollars: false },
      { name: 'Overhead', kind: 'overhead', qty: 1, unit: 'month', dollarsPerUnit: 3000, showDollars: true },
    ],
  },
  {
    output: { name: 'Haircuts', qty: 300, unit: 'cuts', dollarsPerUnit: 35, showDollars: false },
    inputs: [
      { name: 'Stylists', kind: 'labor', qty: 250, unit: 'hours', dollarsPerUnit: 22, showDollars: false },
      { name: 'Products', kind: 'materials', qty: 300, unit: 'bottles', dollarsPerUnit: 1.5, showDollars: false },
      { name: 'Chair rent', kind: 'overhead', qty: 1, unit: 'month', dollarsPerUnit: 1100, showDollars: true },
    ],
  },
]

let seq = 1

/** a random transformation: one template with jittered quantities */
export function randomCase(): Transformation {
  const t = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
  return {
    output: { ...t.output, qty: jitter(t.output.qty) },
    inputs: t.inputs.map((inp) => ({
      ...inp,
      id: `r${seq++}`,
      qty: inp.unit === 'month' ? inp.qty : jitter(inp.qty),
    })),
  }
}

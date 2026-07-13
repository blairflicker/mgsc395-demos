export type ChapterStatus = 'available' | 'coming-soon'

export interface Chapter {
  /** URL segment, e.g. "ch3" -> /ch3 */
  slug: string
  /** e.g. "Chapter 3" or "Supplement B" */
  label: string
  /** Demo title shown on the card and page header */
  title: string
  /** One-sentence description of what the demo does */
  description: string
  status: ChapterStatus
  /** Which exam block the chapter belongs to (1, 2, or 3) */
  exam: 1 | 2 | 3
}

export const chapters: Chapter[] = [
  // ── Exam 1 ──────────────────────────────────────────────
  {
    slug: 'ch1',
    label: 'Chapter 1',
    title: 'Productivity',
    description:
      'Single-factor, multifactor, and value-based productivity — compute and compare them across scenarios.',
    status: 'coming-soon',
    exam: 1,
  },
  {
    slug: 'supp-a',
    label: 'Supplement A',
    title: 'Break-Even Analysis',
    description:
      'Find the break-even point of a process and compare two competing processes (make vs. buy).',
    status: 'coming-soon',
    exam: 1,
  },
  {
    slug: 'ch2',
    label: 'Chapter 2',
    title: 'Process Strategy & Analysis',
    description:
      'The manufacturing matrix, Pareto charts, and cause-and-effect thinking for process improvement.',
    status: 'coming-soon',
    exam: 1,
  },
  {
    slug: 'ch3',
    label: 'Chapter 3',
    title: 'Quality & Control Charts',
    description:
      'Sample bottles off the shelf, build X̄ and R control charts, and assess process capability.',
    status: 'coming-soon',
    exam: 1,
  },
  {
    slug: 'ch4',
    label: 'Chapter 4',
    title: 'Lean Systems',
    description:
      'Value stream mapping metrics — takt time, per-unit processing time, and finding the bottleneck.',
    status: 'coming-soon',
    exam: 1,
  },
  // ── Exam 2 ──────────────────────────────────────────────
  {
    slug: 'ch5',
    label: 'Chapter 5',
    title: 'Capacity Planning',
    description:
      'Utilization, capacity cushions, and computing how many machines a process really needs.',
    status: 'coming-soon',
    exam: 2,
  },
  {
    slug: 'supp-b',
    label: 'Supplement B',
    title: 'Waiting Lines',
    description:
      'Watch an M/M/1 queue in motion — arrival and service rates, utilization, and Little’s Law.',
    status: 'available',
    exam: 2,
  },
  {
    slug: 'ch6',
    label: 'Chapter 6',
    title: 'Theory of Constraints',
    description:
      'Find the bottleneck and pick the product mix — traditional method vs. bottleneck method.',
    status: 'coming-soon',
    exam: 2,
  },
  {
    slug: 'supp-d',
    label: 'Supplement D',
    title: 'Linear Programming',
    description:
      'Translate a business problem into decision variables, an objective, and constraints — then solve it.',
    status: 'coming-soon',
    exam: 2,
  },
  {
    slug: 'ch7',
    label: 'Chapter 7',
    title: 'Project Management',
    description:
      'Forward and backward pass, slack, the critical path, and cost-time tradeoffs (crashing).',
    status: 'coming-soon',
    exam: 2,
  },
  // ── Exam 3 ──────────────────────────────────────────────
  {
    slug: 'ch8',
    label: 'Chapter 8',
    title: 'Forecasting',
    description:
      'Naive, moving average, exponential smoothing, and regression forecasts — compared with MAD, MSE, and MAPE.',
    status: 'coming-soon',
    exam: 3,
  },
  {
    slug: 'ch9',
    label: 'Chapter 9',
    title: 'Inventory Management (EOQ)',
    description:
      'The economic order quantity model — cost curves, the sawtooth diagram, and reorder points.',
    status: 'coming-soon',
    exam: 3,
  },
  {
    slug: 'ch12',
    label: 'Chapter 12',
    title: 'Supply Chain Design',
    description:
      'Aggregate inventory value, weeks of supply, inventory turnover, and make/buy break-even analysis.',
    status: 'coming-soon',
    exam: 3,
  },
  {
    slug: 'ch13',
    label: 'Chapter 13',
    title: 'Supply Chain Networks',
    description:
      'Facility location — center of gravity, load-distance scores, and comparing candidate sites.',
    status: 'coming-soon',
    exam: 3,
  },
]

export const examBlocks = [
  { exam: 1 as const, title: 'Exam 1 Material' },
  { exam: 2 as const, title: 'Exam 2 Material' },
  { exam: 3 as const, title: 'Exam 3 Material' },
]

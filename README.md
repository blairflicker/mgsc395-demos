# MGSC 395 · Interactive Demos

Interactive demonstrations for **MGSC 395: Operations Management** at the
Darla Moore School of Business, University of South Carolina.

One hands-on demo per chapter: students change the inputs, watch the math
respond, and build intuition for the quantitative tools of operations
management.

## Chapters

Chapter numbers follow the **14th edition** of Krajewski & Malhotra,
_Operations Management: Processes and Supply Chains_. Chapters 2, 11, 12,
13 and Supplement C are not taught, so the numbering has gaps.

| Route | Chapter | Demo |
| --- | --- | --- |
| `/ch1` | Chapter 1 | Productivity |
| `/supp-a` | Supplement A | Break-Even Analysis |
| `/ch3` | Chapter 3 | Process Strategy & Analysis |
| `/ch4` | Chapter 4 | Quality & Performance (Control Charts) |
| `/ch5` | Chapter 5 | Lean Systems |
| `/ch6` | Chapter 6 | Capacity Planning |
| `/supp-b` | Supplement B | Waiting Lines |
| `/ch7` | Chapter 7 | Constraint Management |
| `/supp-d` | Supplement D | Linear Programming |
| `/ch8` | Chapter 8 | Project Management |
| `/ch9` | Chapter 9 | Forecasting |
| `/ch10` | Chapter 10 | Inventory Management (EOQ) |
| `/ch14` | Chapter 14 | Supply Chain Design |
| `/ch15` | Chapter 15 | Logistics Management |

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React Router](https://reactrouter.com/)
- Deployed on [Vercel](https://vercel.com/)

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
```

Each demo lives in `src/pages/demos/` and registers a route in
`src/App.tsx`. The chapter list (titles, descriptions, live/coming-soon
status) lives in `src/lib/chapters.ts`.

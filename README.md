# MGSC 395 · Interactive Demos

Interactive demonstrations for **MGSC 395: Operations Management** at the
Darla Moore School of Business, University of South Carolina.

One hands-on demo per chapter: students change the inputs, watch the math
respond, and build intuition for the quantitative tools of operations
management.

## Chapters

| Route | Chapter | Demo |
| --- | --- | --- |
| `/ch1` | Chapter 1 | Productivity |
| `/supp-a` | Supplement A | Break-Even Analysis |
| `/ch2` | Chapter 2 | Process Strategy & Analysis |
| `/ch3` | Chapter 3 | Quality & Control Charts |
| `/ch4` | Chapter 4 | Lean Systems |
| `/ch5` | Chapter 5 | Capacity Planning |
| `/supp-b` | Supplement B | Waiting Lines |
| `/ch6` | Chapter 6 | Theory of Constraints |
| `/supp-d` | Supplement D | Linear Programming |
| `/ch7` | Chapter 7 | Project Management |
| `/ch8` | Chapter 8 | Forecasting |
| `/ch9` | Chapter 9 | Inventory Management (EOQ) |
| `/ch12` | Chapter 12 | Supply Chain Design |
| `/ch13` | Chapter 13 | Supply Chain Networks |

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

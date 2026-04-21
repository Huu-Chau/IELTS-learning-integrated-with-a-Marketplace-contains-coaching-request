# SPEC: Student Dashboard

## Objective
Build a modern, high-performance Student Dashboard for the IELTS Preparation Platform that serves as the main hub for students to track their progress, view recent AI evaluations, and access practice test routes.

## Enforced Skills
- `@react-best-practices` (Vercel Performance Guidelines)
- `@tailwind-patterns` (Tailwind v4 Architecture)

## Requirements

### 1. Visual & Layout (Tailwind v4)
- **Container Queries**: The dashboard grid must use `@container` so nested cards (like "Recent Scores") adapt to their parent container's width, not the viewport.
- **Asymmetric Grid**: Use a modern "Bento box" style asymmetric grid (`grid-cols-3` or similar with varying spans) for the layout, rather than symmetrical columns.
- **Color System**: Use `oklch()` color definitions. The dashboard must support a seamless dark mode using Tailwind v4 native CSS variables.
- **Typography**: Utilize an `Inter` sans font stack with size scale from `text-xs` up to `text-2xl` for headings.
- **Micro-animations**: Add subtle `transition-transform hover:scale-[1.02]` to practice cards to make the interface feel alive.

### 2. Performance & Architecture (React)
- **Data Fetching (Client)**: Use `SWR` (or React Query) to fetch the student's past evaluation history to ensure request deduplication and built-in caching (`client-swr-dedup`).
- **Eliminate Waterfalls**: If multiple endpoints are needed (e.g. `GET /api/user/stats` and `GET /api/user/recent`), fetch them in parallel using `Promise.all()` or separate parallel SWR hooks (`async-parallel`).
- **Bundle Optimization**: Use `React.lazy()` (client-side equivalent of `next/dynamic`) for heavy charting components (e.g., Recharts for progress graphs) so they don't block initial paint (`bundle-dynamic-imports`).
- **Re-render Optimization**: Extract the expensive chart rendering into memoized components (`rerender-memo`) and avoid subscribing to state in the parent layout if only used by children.

## Scope (v1)
- Welcome banner with student name and overall estimated band score.
- Asymmetric grid layout:
  - "Recent Activity" widget (list of past essays/speaking tests).
  - "Performance Graph" widget (lazy-loaded).
  - "Practice Now" quick-action cards (Writing, Speaking).
- Responsive mobile fallback (stack layout).

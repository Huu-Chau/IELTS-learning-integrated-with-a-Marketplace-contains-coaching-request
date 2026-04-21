<?xml version="1.0" encoding="UTF-8"?>
<plan>
  <task type="auto">
    <name>Create Student Dashboard Layout</name>
    <files>client/src/pages/dashboard/StudentDashboard.tsx, client/src/index.css</files>
    <action>
      1. Define v4 Tailwind theme variables for OKLCH colors in `index.css` if not already present.
      2. Scaffold `StudentDashboard.tsx` using an asymmetric Bento grid (`grid-cols-[repeat(auto-fit,minmax(300px,1fr))]` or specific spans).
      3. Set the parent container with `@container` for responsive children.
      4. Ensure mobile-first: stack normally on mobile, use grid on `md:` breakpoints or `@md` containers.
    </action>
    <verify>Dashboard renders a multi-column asymmetric grid on desktop without horizontal scrolling.</verify>
    <done>Layout supports dynamic resizing and follows Tailwind v4 patterns.</done>
  </task>

  <task type="auto">
    <name>Implement Performance-Optimized Widgets</name>
    <files>client/src/components/dashboard/RecentActivity.tsx, client/src/components/dashboard/PerformanceChart.tsx</files>
    <action>
      1. Create `RecentActivity.tsx`. Fetch data using SWR to prevent duplicate requests across components.
      2. Create `PerformanceChart.tsx`. Apply `React.lazy` and `Suspense` in the parent dashboard when importing this component to optimize the initial JavaScript bundle size.
      3. Memoize the internal list items using `React.memo` to prevent re-renders when the parent fetches updates.
    </action>
    <verify>Network tab shows only one request per unique endpoint; Chart JS chunks load lazily.</verify>
    <done>Widgets are built following React performance best practices and SWR deduplication.</done>
  </task>

  <task type="auto">
    <name>Add Micro-animations and Dark Mode Support</name>
    <files>client/src/pages/dashboard/StudentDashboard.tsx, client/tailwind.css</files>
    <action>
      1. Add `transition-all duration-200 hover:scale-[1.02]` classes to the interactive Practice Cards to make them feel premium.
      2. Ensure all text and border utilities use `dark:text-zinc-100` and `dark:bg-zinc-900` patterns where appropriate, referencing the OKLCH semantic tokens.
      3. Validate that SVG icons have `animate-pulse` or similar subtle feedback on load states to prevent rendering flicker.
    </action>
    <verify>Toggling system dark mode shifts colors seamlessly; hovering over cards scales them slightly.</verify>
    <done>Dashboard feels alive and premium according to the requested skill patterns.</done>
  </task>
</plan>

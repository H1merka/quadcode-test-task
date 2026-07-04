# Framer Motion Performance Optimization Guidelines (2026 Edition)

When writing interactive animations, you must follow these rules to ensure high rendering performance (60/120 FPS) and clean bundle footprints.

## Rule 1: Bundle Size Optimization (Lazy Loading)
- Avoid importing `motion` globally unless necessary.
- Prefer importing `LazyMotion` and `domAnimation` (or `domMax` if exit/layout/drag animations are required).
- Use the `<m.div>` tag instead of `<motion.div>` in combination with `LazyMotion` to trim up to 150KB of Javascript out of the initial bundle size.

## Rule 2: Prevent Unnecessary Re-renders
- Do not animate non-layout parameters with React state loops (e.g., updating coordinates in standard React state).
- Use `useMotionValue()` and `useTransform()` to animate parameters linked to fast scroll positions, mouse move coordinates, or physics-based gestures.
- This bypasses React's virtual DOM reconciliation loop and writes directly to DOM styles.

## Rule 3: Accessibility Guarding
- Respect users who configure `prefers-reduced-motion` at the OS level.
- Always implement the `useReducedMotion` hook to dynamically switch off or minimize scaling/movement transitions:
  ```typescript
  import { useReducedMotion } from "motion/react";
  
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : { type: "spring" };
# Interaction Specification — "Notification Center" Panel

> Test input for the `animation-generator` skill. This is a **textual**
> interaction specification (no screenshot/mockup available), covering the
> component types explicitly called out in `SKILL.md` Step 1: structure,
> layout, typography, colors, and interactive annotations (hover, drag,
> click, gestures) — plus the Tailwind-vs-Framer-Motion split guidance.

## 1. Overview

A floating notification center panel (like a toast/alert inbox) anchored to
the top-right of the viewport. Users can dismiss individual notifications by
clicking a close button or by dragging a card sideways past a threshold
("swipe to dismiss"). A settings row at the bottom lets the user toggle
"Do Not Disturb" mode.

## 2. Layout & Grid

- Root container: fixed position, top-right corner, `24px` inset from the
  viewport edges, max width `420px`, full height on small viewports.
- Vertical stack (flex column), `12px` gap between cards.
- Cards flow top-to-bottom in arrival order (newest on top).
- Below the card stack: a thin divider, then a settings row
  (`Do Not Disturb` label + toggle switch), pinned to the bottom of the
  panel.
- When the list is empty, the card stack area collapses and shows a
  centered empty-state message instead.

## 3. Card Anatomy & Visual Design

Each notification card:
- Rounded rectangle, `16px` corner radius, dark surface
  (`bg-slate-900`), `1px` border (`border-slate-800`), drop shadow.
- Left accent bar (`4px` wide, full height) colored by `type`:
  - `success` → emerald, `info` → indigo, `warning` → amber, `error` → rose.
- Icon (matching `type`) top-left, `title` (bold, 14px) next to it, `body`
  text (13px, slate-400) below, close button (`×`) top-right.
- Close button: `24×24px` hit target, low-opacity by default, full opacity
  on card hover.

## 4. Interaction Behaviors

### 4.1 Card Enter
- Trigger: notification added to the data array (mount).
- Motion: slide in from the right (`x: 40 → 0`) + fade in
  (`opacity: 0 → 1`), spring physics (`stiffness: 300, damping: 30,
  mass: 0.8`), not a linear tween.
- Stagger: each subsequent card in the initial seed list enters ~60ms after
  the previous one (stagger delay derived from index, not hardcoded per
  item).

### 4.2 Card Exit (close button click)
- Trigger: click on the `×` button.
- Motion: fade out + slide out to the right (`opacity: 1 → 0`, `x: 0 → 80`),
  height collapses to `0` as part of the same exit transition so the
  reflow (§4.5) reads as one continuous motion rather than a snap.
- Duration: spring-driven, feels like ~200-250ms to settle.

### 4.3 Hover Lift
- Trigger: pointer hovers over a card (not currently being dragged).
- Motion: `scale: 1 → 1.02`, `y: 0 → -2px`, border color brightens
  (`border-slate-800 → border-indigo-500/50`).
- Implementation split: the lift itself uses Framer Motion `whileHover`
  (spring-based); the border color change can ride on a native Tailwind
  `transition-colors` class since it's a simple two-state color swap.
- On hover end: reverses to resting state via the same spring.

### 4.4 Drag-to-Dismiss
- Trigger: pointer/touch drag starts on a card (horizontal axis only,
  `drag="x"`).
- Elastic rubber-band resistance near the edges of the drag constraints
  (`dragElastic: 0.15`) so the card doesn't move 1:1 with the pointer past
  the natural range.
- Progressive darkening / fade: as the card is dragged, `opacity` and a
  background dimming overlay interpolate with drag distance
  (`useTransform` on the drag `x` motion value) — the further it's dragged,
  the more transparent/dim it becomes, previewing the dismiss outcome.
- Dismiss threshold: if released past `120px` (either direction) or with
  sufficient velocity, the card completes an exit animation identical in
  spirit to §4.2 (flies off in the drag direction) and is removed from the
  data array.
- If released before the threshold: card animates back to `x: 0` via
  spring (snap-back), no dismissal.

### 4.5 List Reflow
- Trigger: any card is removed (via close button or drag-dismiss).
- Motion: remaining cards animate their position smoothly to close the
  gap (`layout` prop / `AnimatePresence` + shared layout animation) rather
  than instantly jumping — this must read as a single fluid re-stack, in
  sync with the removed card's exit motion, not a delayed second step.

### 4.6 Empty State
- Trigger: the last notification is dismissed (array length reaches 0).
- Motion: cross-fade — the card stack area fades out while a centered
  "You're all caught up" message fades in, replacing it in place (no
  layout jump in the panel's overall height/position).
- The empty-state message should itself be present-but-invisible or
  mounted only at this point, animated in with a simple fade (no bounce
  needed here — this is a calm, resting state).

### 4.7 Do Not Disturb Toggle
- A simple on/off switch, native Tailwind CSS v4 transition
  (`transition-transform`/`transition-colors`, ~200ms) — no Framer Motion
  needed since it's a discrete two-state UI control, not a gesture-driven
  or physics-based interaction.
- Toggling does not affect the currently rendered notifications; it only
  affects whether new notifications would be suppressed (out of scope for
  this static spec / component demo — no new notifications are generated
  after mount).

## 5. Accessibility

- All spring/gesture-driven motion must respect `prefers-reduced-motion`:
  when active, reduce transitions to instant/near-instant (`duration: 0`
  or minimal) via Framer Motion's `useReducedMotion` hook, and gate the
  Tailwind transition classes behind the `motion-safe:` variant.
- Close button must be reachable and operable via keyboard (focus-visible
  ring), not only via drag gesture — drag-to-dismiss is a progressive
  enhancement, not the only way to dismiss a card.

## 6. Sample Data Shape (for component props)

```ts
interface NotificationItem {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  body: string;
}
```

Example seed data (3–5 items) to render by default:
1. `success` — "Deploy succeeded" — "Build #482 shipped to production."
2. `info` — "New comment" — "Alex mentioned you in Task Board review."
3. `warning` — "Storage almost full" — "You're using 92% of your quota."
4. `error` — "Payment failed" — "Card ending 4242 was declined."

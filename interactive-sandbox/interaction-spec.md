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

- Root container: fixed position, `top-6 right-6`, width `380px`, max-height
  `80vh`, vertical flex column, `gap-3`.
- Each notification card: full width of container, rounded corners (`rounded-2xl`),
  padding `16px`, horizontal flex layout: `[icon] [title+body] [close button]`.
- Footer settings row: separated by a `1px` top border, horizontal flex,
  `justify-between`, padding `12px 16px`.

## 3. Typography & Color Tokens

- Background: `slate-950` (`#020617`) panel backdrop with `slate-900`
  (`#0f172a`) card background, `slate-800` border (`#1e293b`).
- Text: title `text-slate-50` bold `text-sm`, body `text-slate-400` `text-xs`.
- Accent by notification type:
  - `success` → emerald-400 icon/left-border accent
  - `warning` → amber-400
  - `error` → rose-400
  - `info` → indigo-400
- Font: system UI stack (see `globals.v4.css`).

## 4. Components & States

### 4.1 Notification Card
- **Default**: static, drop shadow `shadow-lg`, left accent border 3px colored
  by `type`.
- **Enter animation**: slides in from the right (`x: 40 → 0`) with fade-in
  (`opacity: 0 → 1`), spring physics (natural overshoot, not linear).
- **Exit animation** (dismiss via close button OR drag-past-threshold):
  fades out and slides fully off to the right (`x: 0 → 120`, `opacity: 1 → 0`),
  remaining cards below smoothly re-flow upward to fill the gap (layout
  animation, not an abrupt jump).
- **Hover**: slight lift (`y: -2px`, subtle scale `1.01`) + border color
  brightens.
- **Drag gesture**: horizontal-only drag (`drag="x"`), elastic constraint
  (rubber-band resistance when dragging left, since only right-dismiss is
  allowed), background darkens progressively as drag distance increases
  (visual affordance that release will dismiss), snaps back with spring if
  released before the ~35% width threshold.
- **Click on body** (not close button, not during drag): expands the card in
  place to reveal full notification text if truncated (`AnimatePresence`
  height auto-animation).

### 4.2 Close Button (icon, top-right of each card)
- **Default**: ghost icon button, `text-slate-500`.
- **Hover**: `whileHover` scale `1.15`, color brightens to `text-slate-200`.
- **Tap**: `whileTap` scale `0.9` (quick tactile feedback before exit
  animation plays).

### 4.3 "Do Not Disturb" Toggle (footer)
- **Simple micro-interaction — use native Tailwind CSS v4 transitions, NOT
  Framer Motion** (per SKILL.md guidance: simple state transitions are
  cheaper as CSS transitions):
  - Track: `bg-slate-700` → `bg-indigo-500` when active, `transition-colors`.
  - Knob: `translate-x-0` → `translate-x-4`, `transition-transform`.

### 4.4 Empty State
- When the last notification is dismissed, show a centered fade-in message
  ("You're all caught up") using `AnimatePresence` cross-fade with the list.

## 5. Motion Technology Split (per performance.md)

| Interaction | Technology | Rationale |
|---|---|---|
| Card enter/exit, reflow | Framer Motion (`layout`, `AnimatePresence`) | Complex layout transitions between list states |
| Drag-to-dismiss | Framer Motion (`drag`, `whileDrag`, `dragConstraints`) | Native gesture + physics, impossible in pure CSS |
| Card hover lift | Framer Motion (`whileHover`) — combined with layout, keep in the same engine | Consistency with drag/exit springs on the same element |
| Close button hover/tap | Framer Motion (`whileHover`/`whileTap`) | Needs spring-based tactile feel |
| DND toggle switch | Tailwind CSS v4 transition utilities | Simple 2-state binary toggle, no physics needed |
| Empty state fade | Framer Motion (`AnimatePresence`) | Cross-fade coordinated with list unmount |

## 6. Accessibility

- Respect `prefers-reduced-motion`: disable slide/scale/drag physics,
  fall back to instant opacity cross-fades only (see `useReducedMotion` in
  `references/performance.md` and the CSS fallback block in `globals.v4.css`).
- Close button must be reachable/operable via keyboard (`Enter`/`Space`),
  not just pointer drag — drag-to-dismiss is a progressive enhancement, not
  the only way to dismiss.
- Maintain color contrast AA between accent colors and `slate-900` background.

## 7. Sample Data Shape (for component props)

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

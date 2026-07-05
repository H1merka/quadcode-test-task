import React, { useState } from "react";
import {
  m,
  AnimatePresence,
  LazyMotion,
  domMax,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
  type Transition,
} from "motion/react";

/**
 * Notification Center panel — generated from interaction-spec.md by the
 * animation-generator skill.
 *
 * Covers: §4.1 enter (staggered spring), §4.2 close-button exit, §4.3 hover
 * lift, §4.4 drag-to-dismiss (elastic + progressive darkening), §4.5 list
 * reflow (layout), §4.6 empty-state cross-fade, §4.7 Do Not Disturb toggle
 * (native Tailwind), §5 accessibility (useReducedMotion + motion-safe:).
 *
 * Motion split per spec:
 *  - Framer Motion / motion (m.*): enter/exit, hover lift, drag physics,
 *    list reflow, empty-state cross-fade.
 *  - Native Tailwind transitions: card border-color hover swap, DND toggle.
 */

export interface NotificationItem {
  id: string;
  type: "success" | "warning" | "error" | "info";
  title: string;
  body: string;
}

interface ComponentProps {
  notifications?: NotificationItem[];
}

// Threshold (px) past which a drag release dismisses the card (§4.4).
const DISMISS_THRESHOLD = 120;

// Spring physics from §4.1 — reused across enter/hover/reflow.
const SPRING: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// Per-type accent bar color (§3) + matching icon glyph.
const TYPE_STYLES: Record<
  NotificationItem["type"],
  { accent: string; icon: string; iconColor: string }
> = {
  success: { accent: "bg-emerald-500", icon: "✓", iconColor: "text-emerald-400" },
  info: { accent: "bg-indigo-500", icon: "ℹ", iconColor: "text-indigo-400" },
  warning: { accent: "bg-amber-500", icon: "⚠", iconColor: "text-amber-400" },
  error: { accent: "bg-rose-500", icon: "✕", iconColor: "text-rose-400" },
};

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", type: "success", title: "Deploy succeeded", body: "Build #482 shipped to production." },
  { id: "n2", type: "info", title: "New comment", body: "Alex mentioned you in Task Board review." },
  { id: "n3", type: "warning", title: "Storage almost full", body: "You're using 92% of your quota." },
  { id: "n4", type: "error", title: "Payment failed", body: "Card ending 4242 was declined." },
];

interface NotificationCardProps {
  item: NotificationItem;
  index: number;
  onDismiss: (id: string) => void;
  reduceMotion: boolean;
}

/**
 * Per references/performance.md Rule 4: this custom component is rendered as a
 * direct child of <AnimatePresence> with layout/exit, so it MUST be wrapped in
 * React.forwardRef and forward the ref to its root <m.div>, otherwise
 * AnimatePresence cannot measure the node on unmount and exit/reflow break.
 */
const NotificationCard = React.forwardRef<HTMLDivElement, NotificationCardProps>(
  function NotificationCard({ item, index, onDismiss, reduceMotion }, ref) {
    const styles = TYPE_STYLES[item.type];

    // Drag motion value (§4.4). useMotionValue avoids React re-renders per Rule 2.
    const x = useMotionValue(0);
    // Progressive darkening/fade previewing dismiss outcome (§4.4).
    const opacity = useTransform(x, [-DISMISS_THRESHOLD, 0, DISMISS_THRESHOLD], [0.4, 1, 0.4]);
    const dimOverlay = useTransform(
      x,
      [-DISMISS_THRESHOLD, 0, DISMISS_THRESHOLD],
      [0.55, 0, 0.55]
    );

    function handleDragEnd(_e: unknown, info: PanInfo) {
      const past = Math.abs(info.offset.x) > DISMISS_THRESHOLD;
      const fast = Math.abs(info.velocity.x) > 500;
      if (past || fast) {
        onDismiss(item.id);
      }
      // If not dismissed, drag prop's own spring snaps x back to 0 (§4.4).
    }

    // Enter animation (§4.1) with index-derived stagger (~60ms each).
    // Reduced motion (§5): near-instant, no offset.
    const enter = reduceMotion
      ? { initial: { opacity: 1, x: 0 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0 } }
      : {
          initial: { opacity: 0, x: 40 },
          animate: { opacity: 1, x: 0 },
          transition: { ...SPRING, delay: index * 0.06 },
        };

    // Exit (§4.2): fade + slide right + height collapse, one continuous motion.
    const exit = reduceMotion
      ? { opacity: 0, transition: { duration: 0 } }
      : { opacity: 0, x: 80, height: 0, marginBottom: 0, transition: { ...SPRING } };

    return (
      <m.div
        ref={ref}
        layout={!reduceMotion}
        initial={enter.initial}
        animate={enter.animate}
        exit={exit}
        transition={enter.transition}
        drag={reduceMotion ? false : "x"}
        dragElastic={0.15}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x, opacity }}
        whileHover={reduceMotion ? undefined : { scale: 1.02, y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        className="group relative flex gap-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4 pl-5 shadow-lg motion-safe:transition-colors hover:border-indigo-500/50 cursor-grab active:cursor-grabbing"
      >
        {/* Left accent bar (§3), colored by type. */}
        <span className={`absolute left-0 top-0 h-full w-1 ${styles.accent}`} aria-hidden="true" />

        {/* Progressive dim overlay driven by drag distance (§4.4). */}
        <m.span
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: dimOverlay }}
          aria-hidden="true"
        />

        {/* Icon (§3). */}
        <div className={`mt-0.5 shrink-0 text-lg leading-none ${styles.iconColor}`} aria-hidden="true">
          {styles.icon}
        </div>

        {/* Text block. */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-100">{item.title}</p>
          <p className="mt-1 text-[13px] leading-snug text-slate-400">{item.body}</p>
        </div>

        {/* Close button (§3): 24x24 hit target, low opacity -> full on hover (§3).
            Keyboard-operable with focus ring (§5). */}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          aria-label={`Dismiss notification: ${item.title}`}
          className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 opacity-50 motion-safe:transition-opacity hover:text-slate-200 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          ×
        </button>
      </m.div>
    );
  }
);

export const InteractiveComponent: React.FC<ComponentProps> = ({
  notifications = DEFAULT_NOTIFICATIONS,
}) => {
  const reduceMotion = useReducedMotion() ?? false;
  const [items, setItems] = useState<NotificationItem[]>(notifications);
  const [dnd, setDnd] = useState(false);

  function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  const isEmpty = items.length === 0;

  return (
    <LazyMotion features={domMax}>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        {/* Root panel: fixed top-right, 24px inset, max-width 420px (§2). */}
        <div className="fixed right-6 top-6 flex max-h-[calc(100vh-3rem)] w-[calc(100vw-3rem)] max-w-[420px] flex-col rounded-3xl border border-slate-800/60 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-sm">
          <header className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold tracking-wide text-slate-300">Notifications</h2>
            <span className="text-xs text-slate-500">{items.length}</span>
          </header>

          {/* Card stack area — cross-fades with empty state (§4.6). */}
          <div className="relative flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {isEmpty ? (
                <EmptyState key="empty" reduceMotion={reduceMotion} />
              ) : (
                <m.div
                  key="list"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <AnimatePresence initial={false}>
                    {items.map((item, index) => (
                      <NotificationCard
                        key={item.id}
                        item={item}
                        index={index}
                        onDismiss={dismiss}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </AnimatePresence>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider + settings row pinned to bottom (§2, §4.7). */}
          <div className="mt-3 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="dnd-toggle" className="text-sm text-slate-300 select-none">
                Do Not Disturb
              </label>
              {/* Native Tailwind two-state toggle (§4.7) — no Framer Motion. */}
              <button
                id="dnd-toggle"
                type="button"
                role="switch"
                aria-checked={dnd}
                onClick={() => setDnd((v) => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  dnd ? "bg-indigo-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow motion-safe:transition-transform ${
                    dnd ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
};

/**
 * Empty-state message (§4.6). Also a direct AnimatePresence child, so wrapped
 * in forwardRef per Rule 4 (same reasoning as NotificationCard).
 */
const EmptyState = React.forwardRef<HTMLDivElement, { reduceMotion: boolean }>(
  function EmptyState({ reduceMotion }, ref) {
    return (
      <m.div
        ref={ref}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/60 text-2xl text-slate-400">
          ✓
        </div>
        <p className="text-sm font-medium text-slate-300">You're all caught up</p>
        <p className="mt-1 text-xs text-slate-500">No new notifications.</p>
      </m.div>
    );
  }
);

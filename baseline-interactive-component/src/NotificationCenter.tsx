import React, { forwardRef, useMemo, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2, Info, X, XCircle } from 'lucide-react';

/**
 * Notification Center — hand-written baseline implementation of
 * interaction-spec.md, built WITHOUT the animation-generator skill.
 *
 * Covers: §4.1 enter, §4.2 exit, §4.3 hover lift, §4.4 drag-to-dismiss,
 * §4.5 list reflow, §4.6 empty state, §4.7 Do Not Disturb toggle, §5 a11y.
 */

export interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  body: string;
}

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    type: 'success',
    title: 'Deploy succeeded',
    body: 'Build #482 shipped to production.',
  },
  {
    id: 'n2',
    type: 'info',
    title: 'New comment',
    body: 'Alex mentioned you in Task Board review.',
  },
  {
    id: 'n3',
    type: 'warning',
    title: 'Storage almost full',
    body: "You're using 92% of your quota.",
  },
  {
    id: 'n4',
    type: 'error',
    title: 'Payment failed',
    body: 'Card ending 4242 was declined.',
  },
];

const ACCENT_BAR: Record<NotificationItem['type'], string> = {
  success: 'bg-emerald-500',
  info: 'bg-indigo-500',
  warning: 'bg-amber-500',
  error: 'bg-rose-500',
};

const ICON_COLOR: Record<NotificationItem['type'], string> = {
  success: 'text-emerald-400',
  info: 'text-indigo-400',
  warning: 'text-amber-400',
  error: 'text-rose-400',
};

const ICONS: Record<NotificationItem['type'], React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

// Drag-to-dismiss threshold — §4.4: released past 120px (either direction) dismisses.
const DISMISS_THRESHOLD = 120;
// Velocity (px/s) past which a fast flick dismisses even under the distance threshold.
const DISMISS_VELOCITY = 500;

const SPRING = { stiffness: 300, damping: 30, mass: 0.8 };
const INSTANT = { duration: 0 };

interface NotificationCardProps {
  notification: NotificationItem;
  index: number;
  onDismiss: (id: string) => void;
  reducedMotion: boolean;
}

const NotificationCard = forwardRef<HTMLDivElement, NotificationCardProps>(
  function NotificationCard({ notification, index, onDismiss, reducedMotion }, ref) {
    const Icon = ICONS[notification.type];
    const x = useMotionValue(0);

    // §4.4 progressive darkening/fade as the card is dragged — interpolated off the
    // live drag x motion value, previewing the dismiss outcome.
    const dragOpacity = useTransform(x, [-DISMISS_THRESHOLD * 2, 0, DISMISS_THRESHOLD * 2], [0.25, 1, 0.25]);

    function handleDragEnd(_: unknown, info: PanInfo) {
      const distance = Math.abs(info.offset.x);
      const velocity = Math.abs(info.velocity.x);
      if (distance > DISMISS_THRESHOLD || velocity > DISMISS_VELOCITY) {
        onDismiss(notification.id);
      }
      // If under threshold, Framer's dragConstraints + elastic snap-back handles
      // the return to x:0 automatically once the pointer is released.
    }

    return (
      <motion.div
        ref={ref}
        layout={!reducedMotion}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 80, height: 0, marginBottom: 0 }}
        transition={
          reducedMotion
            ? INSTANT
            : { ...SPRING, delay: index * 0.06 }
        }
        style={{ x, opacity: dragOpacity }}
        drag={reducedMotion ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        whileHover={reducedMotion ? undefined : { scale: 1.02, y: -2, transition: SPRING }}
        whileDrag={reducedMotion ? undefined : { cursor: 'grabbing' }}
        className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg motion-safe:transition-colors motion-safe:duration-200 hover:border-indigo-500/50"
      >
        {/* Left accent bar, §3 */}
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${ACCENT_BAR[notification.type]}`}
        />

        <div className="flex items-start gap-2.5 py-3 pl-5 pr-3">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ICON_COLOR[notification.type]}`} aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-snug text-slate-50">{notification.title}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-slate-400">{notification.body}</p>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(notification.id)}
            aria-label={`Dismiss notification: ${notification.title}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-50 outline-none transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-400 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    );
  },
);

// Rendered as a direct AnimatePresence child (see NotificationCenter render below),
// so it must forward its ref to the root motion.div — otherwise AnimatePresence
// can't measure/track it for exit animations and React warns
// "Function components cannot be given refs".
const EmptyState = forwardRef<HTMLDivElement>(function EmptyState(_props, ref) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-800 py-10 text-center"
    >
      <Bell className="h-6 w-6 text-slate-600" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-400">You're all caught up</p>
    </motion.div>
  );
});

function DoNotDisturbToggle() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <span className="text-[13px] font-medium text-slate-300">Do Not Disturb</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((v) => !v)}
        className={`relative h-6 w-11 shrink-0 rounded-full outline-none motion-safe:transition-colors motion-safe:duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          enabled ? 'bg-indigo-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow motion-safe:transition-transform motion-safe:duration-200 ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const reducedMotionPref = useReducedMotion();
  const reducedMotion = Boolean(reducedMotionPref);

  const isEmpty = notifications.length === 0;

  const handleDismiss = useMemo(
    () => (id: string) => {
      setNotifications((current) => current.filter((n) => n.id !== id));
    },
    [],
  );

  return (
    <div
      className="fixed right-6 top-6 z-50 flex max-h-[calc(100vh-48px)] w-full max-w-[420px] flex-col"
      aria-live="polite"
    >
      {/* §4.5/§4.6 — AnimatePresence with `popLayout` so remaining cards reflow in
          sync with the removed card's exit, and the empty state cross-fades in. */}
      <div className="flex min-h-[64px] flex-1 flex-col gap-3 overflow-y-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          {isEmpty ? (
            <EmptyState key="empty-state" />
          ) : (
            notifications.map((notification, index) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                index={index}
                onDismiss={handleDismiss}
                reducedMotion={reducedMotion}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* §2 — thin divider + settings row pinned to the bottom of the panel */}
      <div className="mt-3 border-t border-slate-800">
        <DoNotDisturbToggle />
      </div>
    </div>
  );
}

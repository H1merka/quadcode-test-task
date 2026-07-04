import React, { useState } from "react";
import { m, AnimatePresence, LazyMotion, domMax } from "motion/react";

interface ComponentProps {
  title?: string;
  items?: Array<{ id: string; label: string; description: string }>;
}

interface CardItem {
  id: string;
  label: string;
  description: string;
}

// Per references/performance.md Rule 4: a custom component rendered as a direct
// child of AnimatePresence with layout/exit MUST forward its ref to the root
// <m.div> so AnimatePresence can measure the node on unmount.
const BoardCard = React.forwardRef<
  HTMLDivElement,
  { item: CardItem; onSelect: (id: string) => void; transition: object }
>(function BoardCard({ item, onSelect, transition }, ref) {
  return (
    <m.div
      ref={ref}
      layoutId={`card-${item.id}`}
      onClick={() => onSelect(item.id)}
      className="flex flex-col p-5 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer shadow-lg hover:border-indigo-500/50 transition-colors"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={transition}
    >
      <m.h3 className="text-lg font-bold text-indigo-300">{item.label}</m.h3>
      <p className="text-slate-400 text-sm mt-1">{item.description}</p>
    </m.div>
  );
});

export const InteractiveComponent: React.FC<ComponentProps> = ({
  title = "Interactive Board",
  items = [
    { id: "1", label: "Task Card A", description: "Drag and inspect details." },
    { id: "2", label: "Task Card B", description: "Smooth fluid layouts." }
  ]
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Transition settings for realistic physical spring motion
  const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 0.8
  };

  return (
    <LazyMotion features={domMax}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-white selection:bg-indigo-500">
        <h1 className="text-3xl font-extrabold mb-8 tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          {title}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          {items.map((item) => (
            <BoardCard key={item.id} item={item} onSelect={setSelectedId} transition={springTransition} />
          ))}
        </div>

        {/* Modal Overlay / Shared Element Transition */}
        <AnimatePresence>
          {selectedId && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              {/* Backdrop */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedId(null)}
                className="absolute inset-0 bg-black"
              />

              {/* Expanded Card */}
              {items
                .filter((item) => item.id === selectedId)
                .map((item) => (
                  <m.div
                    layoutId={`card-${item.id}`}
                    key={`modal-${item.id}`}
                    className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-10"
                    transition={springTransition}
                  >
                    <m.h3 className="text-2xl font-black text-indigo-300">
                      {item.label}
                    </m.h3>
                    <m.p className="text-slate-300 mt-4 leading-relaxed">
                      {item.description} Detailed interactive viewport. Supports smooth animations, spring dynamics, and touch gesture dismissals natively.
                    </m.p>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="mt-6 px-4 py-2 w-full bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-xl font-bold text-sm text-white"
                    >
                      Close Details
                    </button>
                  </m.div>
                ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
};
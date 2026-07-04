import React, { useState } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "motion/react";

/**
 * PLACEHOLDER COMPONENT — harness smoke-test fixture.
 *
 * This is a direct copy of `skills/animation-generator/assets/Component.template.tsx`.
 * Its only purpose is to prove the harness plumbing (Vite + React + Tailwind v4 +
 * Framer Motion) renders and animates correctly BEFORE the skill is invoked.
 *
 * When the animation-generator skill actually runs against `interaction-spec.md`,
 * it will overwrite this file with the real generated component.
 */

interface ComponentProps {
  title?: string;
  items?: Array<{ id: string; label: string; description: string }>;
}

export const InteractiveComponent: React.FC<ComponentProps> = ({
  title = "Interactive Board (harness placeholder)",
  items = [
    { id: "1", label: "Task Card A", description: "Drag and inspect details." },
    { id: "2", label: "Task Card B", description: "Smooth fluid layouts." }
  ]
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const springTransition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
    mass: 0.8
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-white selection:bg-indigo-500">
        <h1 className="text-3xl font-extrabold mb-8 tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          {title}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
          {items.map((item) => (
            <motion.div
              layoutId={`card-${item.id}`}
              onClick={() => setSelectedId(item.id)}
              key={item.id}
              className="flex flex-col p-5 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer shadow-lg hover:border-indigo-500/50 transition-colors"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={springTransition}
            >
              <motion.h3 className="text-lg font-bold text-indigo-300">
                {item.label}
              </motion.h3>
              <p className="text-slate-400 text-sm mt-1">{item.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Modal Overlay / Shared Element Transition */}
        <AnimatePresence>
          {selectedId && (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedId(null)}
                className="absolute inset-0 bg-black"
              />

              {items
                .filter((item) => item.id === selectedId)
                .map((item) => (
                  <motion.div
                    layoutId={`card-${item.id}`}
                    key={`modal-${item.id}`}
                    className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl z-10"
                    transition={springTransition}
                  >
                    <motion.h3 className="text-2xl font-black text-indigo-300">
                      {item.label}
                    </motion.h3>
                    <motion.p className="text-slate-300 mt-4 leading-relaxed">
                      {item.description} Detailed interactive viewport. Supports smooth animations, spring dynamics, and touch gesture dismissals natively.
                    </motion.p>
                    <button
                      onClick={() => setSelectedId(null)}
                      className="mt-6 px-4 py-2 w-full bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-xl font-bold text-sm text-white"
                    >
                      Close Details
                    </button>
                  </motion.div>
                ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
};

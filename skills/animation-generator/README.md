# animation-generator

Analyzes static wireframes, mockup screenshots, or textual interaction specifications and generates a production-grade, highly interactive React component powered by **Framer Motion** (`motion/react`) and **Tailwind CSS v4**.

- Type: `tools: motion designer`
- Subtype: `frontend`
- Context: `fork`
- Invocation: `user-invocable: true`, `disable-model-invocation: true` (see [Invocation](#invocation))

## Table of Contents
- [Quick Start](#quick-start)
- [Invocation](#invocation)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Step-by-Step Usage](#step-by-step-usage)
- [Optional: Deterministic Preview Video (Step 5)](#optional-deterministic-preview-video-step-5)
- [Testing Checklist](#testing-checklist)
- [Caveats](#caveats)
- [File Map](#file-map)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# 1. Provide an input: a screenshot/mockup image OR a text interaction spec
#    (e.g. interaction-spec.md in the project root)

# 2. Invoke the skill (see Invocation below), pointing it at the input.

# 3. Skill generates ./interactive-sandbox/ with:
#    globals.css, package.json, postcss.config.js, InteractiveComponent.tsx, setup.sh

# 4. Install & run (harness is NOT auto-created — see Caveats):
cd interactive-sandbox
chmod +x setup.sh && ./setup.sh   # or: npm install
npm run dev                        # requires a host harness, see Caveats
```

## Invocation

The skill has `disable-model-invocation: true`, meaning the agent will **not** auto-trigger it just because a task looks animation-related. You must invoke it explicitly, using any of:

1. **Slash command / alias** — `animation-generator`
2. **Explicit natural-language request** — e.g. "Use the animation-generator skill on this mockup" or "Generate an interactive component from this interaction spec"
3. **Web template alias** — `ToolGetTemplateContent(alias="animation-generator")` if invoked programmatically by another agent

Simply describing an animation task without naming/aliasing the skill will **not** reliably trigger it — be explicit.

## Inputs

One of:
1. **Image** — a wireframe, mockup screenshot, or Figma export showing structure, layout, typography, colors, and interactive annotations (hover/drag/click/gesture callouts).
2. **Textual interaction specification** (Markdown) — describing the same information in prose. Must cover, per Step 1 of `SKILL.md`:
   - Structure & layout (containers, grids, stacking)
   - Typography & colors
   - Interactive behaviors (enter/exit, hover, drag, click, gestures, list reflow, empty states)
   - Accessibility requirements (`prefers-reduced-motion`)
   - Sample data shape (TypeScript interface + example seed data)

See `../../interaction-spec.md` (project root) for a full canonical example (Notification Center panel spec).

## Outputs

All output is written to `./interactive-sandbox/` (relative to wherever the skill is invoked from):

| File | Purpose |
|---|---|
| `globals.css` | Tailwind v4 styling entry point (from `assets/globals.v4.css`) |
| `package.json` | React 18 + `motion` + Tailwind v4 dependencies |
| `postcss.config.js` | PostCSS config with `@tailwindcss/postcss` |
| `InteractiveComponent.tsx` | The generated component (spring physics, gestures, `AnimatePresence`, accessibility guards) |
| `setup.sh` | Dependency installation helper (mirrors `scripts/setup-motion.sh`) |

**Not included by default:** a runnable host harness (`index.html`, `vite.config.ts`, `main.tsx`). The skill explicitly does not assume one exists — see [Caveats](#caveats).

## Step-by-Step Usage

1. **Analyze** — the skill scans your input for layout/typography/color/interaction annotations and decides, per interaction, whether it belongs to native Tailwind CSS transitions (simple two-state micro-interactions) or Framer Motion (gestures, drag, physics, shared-layout transitions).
2. **Workspace setup** — creates `./interactive-sandbox/`, writes `globals.css`, `package.json`, `postcss.config.js`.
3. **Component synthesis** — writes `InteractiveComponent.tsx` following `assets/Component.template.tsx`:
   - Spring physics instead of linear tweens
   - `whileHover` / `whileTap` / `drag` / `whileDrag` gesture handlers
   - `AnimatePresence` for exit animations
   - Custom components rendered as direct `AnimatePresence` children with `layout`/`exit` are wrapped in `React.forwardRef` (see `references/performance.md` Rule 4) — otherwise exit/reflow animations silently break with a React ref warning.
   - `useReducedMotion` + Tailwind `motion-safe:` variant for accessibility.
4. **Installation helper** — writes `setup.sh` and gives you a summary of how to install and run the component, **explicitly flagging** if no host harness exists in the target project.
5. **(Optional) Deterministic preview video** — see below. Only runs if you explicitly ask for a video/GIF/still.

## Optional: Deterministic Preview Video (Step 5)

Only triggered when you explicitly ask for a video/GIF/still-frame preview. Skipped by default — Steps 1-4 alone already produce a fully working component.

**Why it's needed:** `InteractiveComponent.tsx`'s animations are driven by live browser events (hover, drag, click). Remotion's headless frame-by-frame renderer has no pointer/DOM events, so every interactive beat is re-expressed as a **deterministic, frame-indexed timeline** (`interpolate()` / `spring()` off `useCurrentFrame()`) inside an isolated `remotion_render/` project — never inside `interactive-sandbox/`.

Pipeline (reuses the `render_remotion` skill as-is, no custom Docker/build logic):

```bash
# Build once
cd remotion_render && docker build -t remotion-renderer .

# Render (from repo root!)
REMOTION_PROJECT="$(pwd)/remotion_render" ./remotion_render/render.sh AnimationPreview out/animation-preview.mp4

# Also supports:
#   --codec=gif   → shareable GIF
#   still render  → single key frame
```

Output: `remotion_render/out/animation-preview.mp4` (or `.gif`). The summary given to you will state which interactions were scripted vs. skipped — this is a **deterministic approximation**, not a literal recording of a real user session.

## Testing Checklist

Pre-test (clean directory):
- [ ] `interactive-sandbox/` and `remotion_render/` do not exist yet
- [ ] Input (image or `interaction-spec.md`) is present

Steps 1-4 verification:
- [ ] All 5 output files exist: `globals.css`, `package.json`, `postcss.config.js`, `InteractiveComponent.tsx`, `setup.sh`
- [ ] Final summary explicitly states whether a host harness is missing (does not silently assume one exists)
- [ ] Custom card/list-item components used as direct `AnimatePresence` children are wrapped in `React.forwardRef` — no `Warning: Function components cannot be given refs` in the browser console
- [ ] `useReducedMotion` and `motion-safe:` variants are present for every spring/gesture animation
- [ ] No `// TODO` / placeholder blocks in `InteractiveComponent.tsx`
- [ ] Strict TypeScript typing on all props/state

Harness setup (manual step, not part of the skill):
- [ ] `index.html`, `vite.config.ts` (bind `host: 127.0.0.1` for local testing), `src/main.tsx` added manually
- [ ] `npm install && npm run dev` — no console errors/warnings

Step 5 (optional, only if requested):
- [ ] Docker daemon down → skill attempts auto-start (Docker Desktop) and polls up to ~90s before asking the user to intervene
- [ ] cwd-guard: if the shell was previously `cd`'d into a subfolder (e.g. after `cd interactive-sandbox && npm install`), the skill detects/corrects this before running Docker commands
- [ ] Native Windows without Git Bash/WSL → falls back to an explicit `docker run -v ... -e ...` invocation instead of `render.sh`
- [ ] Rendered video/GIF/still matches the `<Composition>` fps/width/height/duration declared in `remotion_render/src/Root.tsx`
- [ ] Timeline offsets (dismiss stagger, empty-state fade start, etc.) are derived from the live data array length, not hardcoded indices

## Caveats

1. **No host harness is generated.** Steps 1-4 only produce the component + its styling/deps — not `index.html`/`vite.config.ts`/`main.tsx`. If your target project has none, the skill must say so in its summary rather than silently assume one exists. Add these files yourself (or ask the skill/agent to scaffold a minimal Vite harness as a separate, explicit step).
2. **Step 5 requires Docker Desktop.** If the daemon isn't reachable, the skill tries to auto-launch it (Windows: `Start-Process "...Docker Desktop.exe"`; macOS: `open -a Docker`) and polls `docker info` for up to 90s before stopping to ask you.
3. **Step 5 requires repo-root cwd.** Running Docker/render commands from a subfolder (left over from an earlier `cd interactive-sandbox && npm install`) breaks every relative path — the skill checks for `package.json`/`.git` in cwd first.
4. **`render.sh` doesn't run on native Windows** without Git Bash/WSL — the skill falls back to an equivalent explicit `docker run` command.
5. **No live gesture recording.** Step 5 never attempts to capture actual drag/hover input — Remotion has no DOM/pointer during render; every interaction is scripted as an equivalent visual timeline.
6. **`interaction-spec.md` at the repo root is a test fixture**, not skill output — keep it as the canonical repeatable input for comparison testing (with-skill vs. without-skill, before/after skill edits).

## File Map

```
skills/animation-generator/
├── SKILL.md                          # agent-facing execution instructions
├── README.md                         # this file
├── LICENSE.txt
├── assets/
│   ├── Component.template.tsx        # canonical component pattern (forwardRef, LazyMotion/domMax, AnimatePresence)
│   └── globals.v4.css                # Tailwind v4 styling baseline
├── references/
│   └── performance.md                # Rules 1-4: bundle size, re-renders, a11y, forwardRef requirement
└── scripts/
    └── setup-motion.sh               # dependency install logic mirrored into generated setup.sh
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Warning: Function components cannot be given refs...` in console | Custom card component as direct `AnimatePresence` child not wrapped in `forwardRef` | Wrap it per `references/performance.md` Rule 4 |
| `npm run dev` fails with "no such file index.html" | Host harness was never created (by design, see Caveats) | Manually scaffold `index.html`/`vite.config.ts`/`main.tsx` |
| Docker build fails with "path not found" | Shell cwd is not the repo root | `cd` back to repo root before any `remotion_render/...` or `docker build` command |
| `render.sh: command not found` / not executable on Windows | No Git Bash/WSL | Use the explicit `docker run -v ... -e ...` fallback documented in `SKILL.md` Step 5 |
| Empty-state timeline desyncs after changing seed data | Hardcoded frame offsets instead of deriving from array length | Ensure `PreviewComposition.tsx` derives offsets from `notifications.length` |

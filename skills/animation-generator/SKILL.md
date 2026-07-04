---
name: animation-generator
alias: animation-generator
description: Analyzes static wireframes, mockup screenshots, or annotated UI drawings to generate responsive, highly interactive React components powered by Framer Motion (motion/react) and Tailwind CSS v4.
type: tools: motion designer
subtype: frontend
tags: react, framer-motion, tailwind, animation
license: LICENSE.txt
user-invocable: true
disable-model-invocation: true
context: fork
---

# Interactive Component Generator (animation-generator)

You are an expert Frontend Motion Engineer. Your goal is to convert static UI screenshots, Figma layouts, or textual interaction specifications into production-grade, highly interactive React components.

## Target Output Directory
Generate all output files in the local `./interactive-sandbox/` folder.

## Execution Steps

### Step 1: Interface & Motion Analysis
- Scan the input image or specification for structure, layout, typography, colors, and interactive annotations (e.g., hover, drag, click, gestures).
- Determine which animations should use native Tailwind CSS v4 transitions (simple micro-interactions) and which should use Framer Motion / Motion for React (complex layout transitions, layoutId, gestures, drag, physics).

### Step 2: Workspace Setup
1. Create `./interactive-sandbox/` directory structure.
2. Initialize and write `./interactive-sandbox/globals.css` based on the Tailwind v4 styling guidelines in `assets/globals.v4.css`.
3. Create the startup dependency configuration — at minimum `package.json` (React 18 + `motion` + Tailwind v4) and `postcss.config.js` (with `@tailwindcss/postcss`), mirroring what `scripts/setup-motion.sh` installs. Note that a runnable preview also needs a host harness (`index.html`, `vite.config.ts`, `main.tsx`); if the target project has none, state this explicitly in the Step 4 summary rather than assuming one exists.

### Step 3: Component Synthesis (`InteractiveComponent.tsx`)
Synthesize the component inside `./interactive-sandbox/InteractiveComponent.tsx` using the pattern in `assets/Component.template.tsx`:
- Import Motion components safely (using `motion/react` or `framer-motion`).
- Implement spring-based physics for natural-feeling micro-interactions instead of linear tweens.
- Integrate gesture handlers (`whileHover`, `whileTap`, `drag`, `whileDrag`) where appropriate.
- Use `AnimatePresence` for exit animations (e.g., conditional cards, dropdowns).
- When a list item / card is extracted into its own custom component and rendered as a direct child of `AnimatePresence` with `layout`/`exit`, wrap it in `React.forwardRef` and forward the ref to its root `<m.div>` (see `references/performance.md`, Rule 4) — otherwise exit/reflow animations break with a React ref warning.
- Maintain accessibility guidelines (support `prefers-reduced-motion` using Tailwind's `motion-safe:` variant and Framer Motion's `useReducedMotion` hook as specified in `references/performance.md`).

### Step 4: Installation Helper Creation
1. Write `./interactive-sandbox/setup.sh` copying the logic from `scripts/setup-motion.sh`.
2. Provide a clean summary guiding the user on how to install dependencies and run the component.

### Step 5: Deterministic Preview Video (optional, via `render_remotion`)
Invoke this step only when the user explicitly asks for a video/GIF/still preview of the generated component. Skip it otherwise — Steps 1-4 alone already produce a fully working interactive component.

Framer Motion animations in `InteractiveComponent.tsx` are driven by live browser events (`whileHover`, `drag`, `onClick`, `AnimatePresence` unmount) and therefore cannot be recorded by Remotion's headless, frame-by-frame renderer as-is: there is no pointer, no drag gesture, no hover state during a Remotion render. Every interactive moment worth previewing must first be re-expressed as a **deterministic, frame-indexed timeline**.

1. **Identify preview beats.** From `interaction-spec.md` (or the equivalent analysis from Step 1), pick the interaction moments that matter for a preview (e.g. card enter, hover lift, drag-to-dismiss, list reflow, empty-state fade). Assign each beat a fixed frame range instead of an event trigger.
2. **Create an isolated Remotion composition.** Following the `render_remotion` skill's scope rules, do all Remotion-specific work inside `remotion_render/` — never inside `interactive-sandbox/` and never by editing a pre-existing main-app `src/Root.tsx`:
   - `remotion_render/src/PreviewComposition.tsx` — a new component that visually mirrors `InteractiveComponent.tsx`'s markup/styling but replaces every gesture-driven Motion prop with values derived from `useCurrentFrame()`.
   - `remotion_render/src/Root.tsx` — register it via `<Composition id="AnimationPreview" component={PreviewComposition} durationInFrames={...} fps={30} width={...} height={...} />`.
3. **Map gestures onto a scripted timeline** — replace event handlers with frame math, e.g.:
   - Enter animation (`initial`→`animate`): `interpolate(frame, [0, 20], [0, 1])` for opacity/x, or `spring({frame, fps, config: {stiffness, damping}})` to keep the same physics feel as the Framer Motion spring.
   - `whileHover` lift: scripted as a fixed hold window (e.g. frames 20-40) where `y`/`scale` are interpolated to the hover values and back, simulating a pointer arriving and leaving.
   - `drag`-to-dismiss: scripted as an `interpolate(frame, [40, 70], [0, DISMISS_THRESHOLD + 40])` sweep of `x`, reusing the same progressive-darkening overlay math (`useTransform` equivalent via `interpolate`), followed by the exit frames.
   - `AnimatePresence` list reflow / empty-state cross-fade: scripted as sequential `interpolate` blocks per remaining item, staggered by a fixed frame offset instead of firing on real unmount.
   - Do NOT attempt to record actual drag/hover input — there is no live DOM/pointer in the Remotion render sandbox; only ever script the equivalent visual end-state transitions.
   - Derive all sequential timeline offsets (per-item dismiss stagger, empty-state fade start, etc.) from `notifications.length` (or the equivalent live-data array length), not from a hardcoded last index/count — a hardcoded offset silently desyncs the timeline the moment the seed data array changes size.
4. **Wire the render pipeline.** Reuse the `render_remotion` skill's existing pipeline as-is — do not reimplement Docker/build logic:
   - Verify/create `remotion_render/` structure, `Dockerfile`, `render.sh`, `package.json` (with `remotion`, `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`) per that skill's Steps 1-4.
   - Verify the shell's current working directory is the repo root (e.g. `test -f package.json -o -d .git`) before running any Docker/render command. A prior step in the same session (e.g. `cd interactive-sandbox && npm install`) may have left the shell `cd`'d into a subfolder, which silently breaks every relative `remotion_render/...` path and `docker build`'s context path.
   - Verify Docker daemon is reachable (`docker info`). If the daemon pipe/socket is unreachable but Docker Desktop is installed, attempt to launch it automatically before asking the user to intervene — cold start commonly takes 30-90s and needs no user interaction:
     - Windows: `Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"`, then poll `docker info` every ~15s for up to 90s.
     - macOS: `open -a Docker`, then poll the same way.
     - Only if `docker info` still fails after polling, stop and ask the user to start Docker Desktop manually.
   - Build once: `cd remotion_render && docker build -t remotion-renderer .`
   - Render: `REMOTION_PROJECT="$(pwd)/remotion_render" ./remotion_render/render.sh AnimationPreview out/animation-preview.mp4`
   - On native Windows (no Git Bash/WSL detected), `render.sh` cannot be executed directly by PowerShell/cmd. Fall back to the equivalent explicit `docker run` invocation instead of the wrapper script:
     `docker run --rm -v "<repo>\remotion_render\src:/app/src:ro" -v "<repo>\remotion_render\public:/app/public:ro" -v "<repo>\remotion_render\out:/app/out" -e COMPOSITION_ID=AnimationPreview -e OUTPUT=/app/out/animation-preview.mp4 remotion-renderer`
   - Same pipeline also supports `--codec=gif` for a shareable GIF preview, or a `still` render for a single key frame (on native Windows, translate these to extra `-e` flags / equivalent `docker run` args the same way).
5. **Summarize for the user.** Report the output path (`remotion_render/out/...`) and explicitly note which interactions were scripted vs. skipped, and that the video is a deterministic approximation of the interactive component, not a literal recording of a user session.

## Core Restrictions
- NO empty state implementations or placeholder blocks (e.g., `// TODO: handle gestures`). Complete all logic.
- Ensure strict TypeScript typing for all component props and state changes.
- Ensure correct SSR/Hydration guarding when using window-based measurements.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Minimal Vite config for the animation-generator test harness.
// PostCSS (postcss.config.js) handles Tailwind CSS v4 compilation,
// matching the tooling installed by scripts/setup-motion.sh.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1", // force IPv4 binding — avoids IPv6-only [::1] listener issues
    port: 5173,
    open: false,
    strictPort: true
  }
});

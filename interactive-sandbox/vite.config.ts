import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bind host 127.0.0.1 for reliable local testing (per skill README harness note).
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
  },
});

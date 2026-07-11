import { defineConfig } from "vite";

// no @vitejs/plugin-react: esbuild's automatic JSX runtime keeps deps to the allowed four
export default defineConfig({
  esbuild: { jsx: "automatic" },
  optimizeDeps: { include: ["react", "react-dom/client", "react/jsx-runtime", "zustand"] },
});

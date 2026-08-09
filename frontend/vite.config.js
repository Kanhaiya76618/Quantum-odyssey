import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// no @vitejs/plugin-react: esbuild's automatic JSX runtime keeps deps minimal
export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: { jsx: "automatic" },
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "react/jsx-runtime",
      "zustand",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      "@react-three/postprocessing",
      "motion/react",
      "lucide-react",
      "react-use-measure",
      "clsx",
      "tailwind-merge",
    ],
  },
});

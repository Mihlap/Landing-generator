import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const apiPort = env.PORT || "8787";
  const apiTarget = `http://127.0.0.1:${apiPort}`;
  const isProd = mode === "production";

  return {
    plugins: [
      react(),
      ...(isProd
        ? [
            obfuscatorPlugin({
              apply: "build",
              options: {
                compact: true,
                simplify: true,
                identifierNamesGenerator: "hexadecimal",
                stringArray: true,
                stringArrayEncoding: ["base64"],
                stringArrayThreshold: 0.85,
                transformObjectKeys: true,
                numbersToExpressions: true,
                splitStrings: true,
                splitStringsChunkLength: 5,
              },
            }),
          ]
        : []),
    ],
    build: {
      minify: "terser",
      sourcemap: false,
      target: "es2019",
      cssMinify: true,
      terserOptions: {
        compress: { passes: 2, pure_funcs: ["console.debug"] },
        mangle: {
          toplevel: true,
        },
        format: { comments: false },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/generate": { target: apiTarget, changeOrigin: true },
        "/export": { target: apiTarget, changeOrigin: true },
        "/preview": { target: apiTarget, changeOrigin: true },
        "/image": { target: apiTarget, changeOrigin: true },
        "/health": { target: apiTarget, changeOrigin: true },
        "/payments": { target: apiTarget, changeOrigin: true },
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      clearMocks: true,
    },
  };
});

import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern",
      },
    },
  },
  plugins: [
    svelte({
      preprocess: vitePreprocess(),
      compilerOptions: { dev: false },
      onwarn: (warning, handler) => {
        if (warning.code !== "unused-export-let") {
          handler(warning);
        }
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.js"),
      name: "SupercomponentsShared",
      fileName: "index",
    },
    rollupOptions: {
      external: ["svelte", "@budibase/bbui"],
      output: {
        globals: {
          svelte: "Svelte",
          "@budibase/bbui": "bbui",
        },
      },
    },
  },
  resolve: {
    alias: {
      $lib: resolve("./src/lib"),
    },
  },
});

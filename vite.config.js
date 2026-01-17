import { defineConfig } from "vite";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

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
      emitCss: true,
      onwarn: (warning, handler) => {
        if (warning.code !== "unused-export-let") {
          handler(warning);
        }
      },
    }),
    cssInjectedByJsPlugin(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.js"),
      name: "SupercomponentsShared",
      fileName: (format) => `index.${format === "umd" ? "umd.cjs" : "js"}`,
      formats: ["es", "umd"],
    },
    cssCodeSplit: true,
    rollupOptions: {
      external: ["svelte", "@budibase/bbui"],
      output: [
        {
          format: "es",
          entryFileNames: "index.js",
          dir: "dist",
          globals: {
            svelte: "Svelte",
            "@budibase/bbui": "bbui",
          },
        },
        {
          format: "umd",
          name: "SupercomponentsShared",
          entryFileNames: "index.umd.cjs",
          globals: {
            svelte: "Svelte",
            "@budibase/bbui": "bbui",
          },
        },
      ],
    },
  },
  resolve: {
    alias: {
      $lib: resolve("./src/lib"),
    },
  },
});

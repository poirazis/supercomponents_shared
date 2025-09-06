import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import sveltePreprocess from "svelte-preprocess";
import sass from "sass";
import path from "path";

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        sass: { implementation: sass },
        typescript: true,
      }),
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
      $lib: resolve(__dirname, "./src/lib"),
    },
  },
});

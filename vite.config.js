import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import sveltePreprocess from 'svelte-preprocess';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess({ typescript: true }),
      compilerOptions: {
        // Disable warnings for unused exports
        dev: false
      },
      // Disable all warnings from the Svelte compiler
      onwarn: (warning, handler) => {
        // Only show warnings that aren't about unused exports
        if (warning.code !== 'unused-export-let') {
          handler(warning);
        }
      }
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'SupercomponentsShared',
      fileName: 'index'
    },
    rollupOptions: {
      external: ['svelte', '@budibase/bbui'],
      output: {
        globals: {
          svelte: 'Svelte',
          '@budibase/bbui': 'bbui'
        }
      }
    }
  },
  resolve: {
    alias: {
      '$lib': resolve(__dirname, './src/lib')
    }
  }
});

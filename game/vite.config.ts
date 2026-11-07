import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const here = fileURLToPath(new URL('.', import.meta.url))
const story = fileURLToPath(new URL('../text-game/src/', import.meta.url))

export default defineConfig({
  base: '/fbx67/play/',
  root: here,
  server: {
    fs: {
      allow: [here, story],
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
  },
})

import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const here = fileURLToPath(new URL('.', import.meta.url))
const stillsDir = fileURLToPath(new URL('./public/stills/', import.meta.url))
const gameSrc = fileURLToPath(new URL('../text-game/src/', import.meta.url))

const virtualId = 'virtual:stills'
const resolvedId = `\0${virtualId}`
const preference = ['webp', 'jpg', 'jpeg', 'png'] as const
const stillFile = /^([a-z0-9_]+)\.(webp|jpe?g|png)$/

const rank = (file: string): number => preference.indexOf(file.split('.').pop() as (typeof preference)[number])

const listStills = (): Record<string, string> => {
  const files = (() => {
    try {
      return readdirSync(stillsDir)
    } catch {
      return []
    }
  })()
  return files
    .filter((f) => stillFile.test(f))
    .sort((a, b) => rank(a) - rank(b))
    .reduce<Record<string, string>>((acc, f) => {
      const id = f.replace(stillFile, '$1')
      return id in acc ? acc : { ...acc, [id]: f }
    }, {})
}

const stills = (): Plugin => ({
  name: 'second-rush-stills',
  resolveId: (id) => (id === virtualId ? resolvedId : undefined),
  load: (id) => (id === resolvedId ? `export default ${JSON.stringify(listStills())}` : undefined),
  configureServer: (server) => {
    const refresh = (file: string) => {
      if (!file.startsWith(stillsDir)) return
      const mod = server.moduleGraph.getModuleById(resolvedId)
      if (mod) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
    }
    server.watcher.add(stillsDir)
    server.watcher.on('add', refresh)
    server.watcher.on('unlink', refresh)
  },
})

export default defineConfig({
  base: '/fbx67/',
  root: here,
  plugins: [stills()],
  server: {
    fs: {
      allow: [here, gameSrc],
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
})

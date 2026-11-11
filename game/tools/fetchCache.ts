import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

type Fetch = (url: string) => Promise<Response>

const exists = (p: string): Promise<boolean> => stat(p).then(() => true, () => false)

// Downloads into a cache directory. Every character fetches the same clip URL into the same file at once, so one
// download per file is shared by every caller; the bytes go to a temp file that is renamed into place only once its
// length matches Content-Length, so a cut-off download never leaves a truncated file for later runs to trust.
export const cachedFetcher = (fetchImpl: Fetch = fetch): ((url: string, path: string) => Promise<string>) => {
  const inFlight = new Map<string, Promise<string>>()

  const download = async (url: string, path: string): Promise<string> => {
    if (await exists(path)) return path
    const res = await fetchImpl(url)
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
    const bytes = Buffer.from(await res.arrayBuffer())
    const expected = res.headers.get('content-length')
    if (expected !== null && Number(expected) !== bytes.length) {
      throw new Error(`short download of ${url}: ${bytes.length} of ${expected} bytes`)
    }
    await mkdir(dirname(path), { recursive: true })
    const part = `${path}.${process.pid}.part`
    try {
      await writeFile(part, bytes)
      await rename(part, path)
    } finally {
      await rm(part, { force: true })
    }
    return path
  }

  return (url, path) => {
    const pending = inFlight.get(path)
    if (pending) return pending
    const p = download(url, path).finally(() => inFlight.delete(path))
    inFlight.set(path, p)
    return p
  }
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PNG } from 'pngjs'
import { checkFrame, framesMarkdown } from './frames.ts'

const image = (paint: (x: number, y: number) => number): Buffer => {
  const png = new PNG({ width: 40, height: 30 })
  Array.from({ length: 40 * 30 }, (_, i) => {
    const v = paint(i % 40, Math.floor(i / 40))
    png.data.set([v, v, v, 255], i * 4)
  })
  return PNG.sync.write(png)
}

const flat = image(() => 60)
const speck = image((x, y) => (x === 3 && y === 3 ? 255 : 60))
const block = image((x, y) => (x < 10 && y < 10 ? 255 : 60))

const scratch = (): string => mkdtempSync(join(tmpdir(), 'frames-'))

test('a frame within tolerance is the same, a changed one writes before, after and diff', () => {
  const root = scratch()
  try {
    const dirs = { baselines: join(root, 'baselines'), report: join(root, 'report'), update: false }
    assert.equal(checkFrame({ ...dirs, update: true }, 'bar', flat).verdict, 'updated')
    assert.equal(checkFrame(dirs, 'bar', flat).verdict, 'same')
    assert.equal(checkFrame(dirs, 'bar', speck).verdict, 'same')
    const changed = checkFrame(dirs, 'bar', block)
    assert.equal(changed.verdict, 'changed')
    assert.equal(changed.changed, 100)
    assert.deepEqual(
      ['before', 'after', 'diff'].map((k) => existsSync(join(dirs.report, 'diff', `bar.${k}.png`))),
      [true, true, true],
    )
    assert.equal(checkFrame(dirs, 'camp', flat).verdict, 'missing')
    assert.ok(existsSync(join(dirs.report, 'frames', 'camp.png')))
    const md = framesMarkdown([changed], 'frames-1')
    assert.match(md, /`diff\/bar\.diff\.png`/)
    assert.match(md, /`frames-1` artifact/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

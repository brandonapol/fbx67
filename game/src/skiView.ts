import * as pc from 'playcanvas'
import { CENTER, SIZE, heightAt } from './skiing.ts'
import { vec } from './world.ts'

// The search's slope drawn rough: the ground of skiing.ts (heightAt) as one grid mesh of snow, shaded by its own
// normals. render.ts calls buildSlope in place of the flat ground box when the space is the search.

export const STEP = 2

const SNOW: readonly [number, number, number] = [0.86, 0.89, 0.93]

export const buildSlope = (app: pc.Application, root: pc.Entity): pc.Entity => {
  const nx = Math.ceil(SIZE.w / STEP) + 1
  const nz = Math.ceil(SIZE.d / STEP) + 1
  const x0 = CENTER.x - SIZE.w / 2
  const z0 = CENTER.z - SIZE.d / 2
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const y = (x: number, z: number): number => heightAt(vec(x, z))
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = x0 + i * STEP
      const z = z0 + j * STEP
      positions.push(x, y(x, z), z)
      const n = new pc.Vec3(-(y(x + 1, z) - y(x - 1, z)) / 2, 1, -(y(x, z + 1) - y(x, z - 1)) / 2).normalize()
      normals.push(n.x, n.y, n.z)
    }
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i
      indices.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1)
    }
  const mesh = new pc.Mesh(app.graphicsDevice)
  mesh.setPositions(positions)
  mesh.setNormals(normals)
  mesh.setIndices(indices)
  mesh.update()
  const material = new pc.StandardMaterial()
  material.diffuse = new pc.Color(SNOW[0], SNOW[1], SNOW[2])
  material.gloss = 0.3
  material.update()
  const e = new pc.Entity('slope')
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: false, receiveShadows: true })
  root.addChild(e)
  return e
}

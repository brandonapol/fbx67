import * as pc from 'playcanvas'

const canvas = document.getElementById('scene')
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('missing #scene')

const app = new pc.Application(canvas, { mouse: new pc.Mouse(canvas), keyboard: new pc.Keyboard(window) })
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
app.setCanvasResolution(pc.RESOLUTION_AUTO)
window.addEventListener('resize', () => app.resizeCanvas())

const camera = new pc.Entity('camera')
camera.addComponent('camera', { clearColor: new pc.Color(0.95, 0.73, 0.54), fov: 45 })
camera.setPosition(0, 8, 9)
camera.lookAt(0, 0, 0)
app.root.addChild(camera)

const sun = new pc.Entity('sun')
sun.addComponent('light', { type: 'directional', color: new pc.Color(1, 0.79, 0.54), castShadows: true })
sun.setLocalEulerAngles(76, 200, 0)
app.root.addChild(sun)

const ground = new pc.Entity('ground')
ground.addComponent('render', { type: 'box' })
ground.setLocalScale(30, 0.1, 30)
app.root.addChild(ground)

app.start()

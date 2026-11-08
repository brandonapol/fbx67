export type Action = 'forward' | 'back' | 'left' | 'right' | 'run' | 'interact' | 'lookLeft' | 'lookRight' | 'lookUp' | 'lookDown'

export type Bindings = Readonly<Record<Action, readonly string[]>>

export type Controls = Readonly<{ bindings: Bindings; invertY: boolean; sensitivity: number }>

export type Stick = Readonly<{ x: number; y: number }>

export type Device = 'keyboard' | 'xbox' | 'playstation' | 'touch'

export type Pad = Readonly<{ id: string; axes: readonly number[]; buttons: readonly boolean[] }>

export const STORAGE_KEY = 'second-rush.controls'

export const actions: readonly Action[] = ['forward', 'back', 'left', 'right', 'run', 'interact', 'lookLeft', 'lookRight', 'lookUp', 'lookDown']

export const actionNames: Readonly<Record<Action, string>> = {
  forward: 'Walk forward',
  back: 'Walk back',
  left: 'Step left',
  right: 'Step right',
  run: 'Run',
  interact: 'Interact',
  lookLeft: 'Look left',
  lookRight: 'Look right',
  lookUp: 'Look up',
  lookDown: 'Look down',
}

export const SENSITIVITY = { min: 0.25, max: 3 } as const

export const defaults: Controls = {
  bindings: {
    forward: ['KeyW', 'ArrowUp'],
    back: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    run: ['ShiftLeft', 'ShiftRight'],
    interact: ['KeyE', 'Space'],
    lookLeft: ['KeyJ'],
    lookRight: ['KeyL'],
    lookUp: ['KeyI'],
    lookDown: ['KeyK'],
  },
  invertY: false,
  sensitivity: 1,
}

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))

const isCodes = (v: unknown): v is readonly string[] =>
  Array.isArray(v) && v.length > 0 && v.every((c) => typeof c === 'string' && c.length > 0)

export const parseControls = (raw: string | null | undefined): Controls => {
  const data = ((): Record<string, unknown> => {
    try {
      const v: unknown = JSON.parse(raw ?? '{}')
      return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  })()
  const saved = data.bindings && typeof data.bindings === 'object' ? (data.bindings as Record<string, unknown>) : {}
  const bindings = Object.fromEntries(
    actions.map((a) => {
      const v = saved[a]
      return [a, isCodes(v) ? v : defaults.bindings[a]]
    }),
  ) as Bindings
  const s = typeof data.sensitivity === 'number' && Number.isFinite(data.sensitivity) ? data.sensitivity : defaults.sensitivity
  return {
    bindings,
    invertY: typeof data.invertY === 'boolean' ? data.invertY : defaults.invertY,
    sensitivity: clamp(s, SENSITIVITY.min, SENSITIVITY.max),
  }
}

export const serialize = (c: Controls): string => JSON.stringify(c)

export const rebind = (c: Controls, action: Action, code: string): Controls => {
  const old = c.bindings[action][0]
  const without = (a: Action): readonly string[] => c.bindings[a].filter((k) => k !== code)
  return {
    ...c,
    bindings: Object.fromEntries(
      actions.map((a) =>
        a === action ? [a, [code, ...without(a).filter((k) => k !== old)]] : [a, without(a).length ? without(a) : [old]],
      ),
    ) as Bindings,
  }
}

export const held = (keys: ReadonlySet<string>, b: Bindings, a: Action): boolean => b[a].some((k) => keys.has(k))

export const actionFor = (b: Bindings, code: string): Action | undefined => actions.find((a) => b[a].includes(code))

const unit = (s: Stick): Stick => {
  const l = Math.hypot(s.x, s.y)
  return l > 1 ? { x: s.x / l, y: s.y / l } : s
}

export const keyStick = (keys: ReadonlySet<string>, b: Bindings): Stick =>
  unit({
    x: (held(keys, b, 'right') ? 1 : 0) - (held(keys, b, 'left') ? 1 : 0),
    y: (held(keys, b, 'forward') ? 1 : 0) - (held(keys, b, 'back') ? 1 : 0),
  })

export const keyLook = (keys: ReadonlySet<string>, b: Bindings): Stick => ({
  x: (held(keys, b, 'lookRight') ? 1 : 0) - (held(keys, b, 'lookLeft') ? 1 : 0),
  y: (held(keys, b, 'lookDown') ? 1 : 0) - (held(keys, b, 'lookUp') ? 1 : 0),
})

export const DEADZONE = 0.2

export const deadzone = (s: Stick, dz = DEADZONE): Stick => {
  const l = Math.hypot(s.x, s.y)
  if (l <= dz) return { x: 0, y: 0 }
  const k = Math.min(1, (l - dz) / (1 - dz)) / l
  return { x: s.x * k, y: s.y * k }
}

export const PAD = { a: 0, b: 1, l3: 10, up: 12, down: 13 } as const

export const padKind = (id: string): 'xbox' | 'playstation' =>
  /054c|playstation|dualshock|dualsense|sony/i.test(id) ? 'playstation' : 'xbox'

export const padMove = (p: Pad): Stick => deadzone({ x: p.axes[0] ?? 0, y: -(p.axes[1] ?? 0) })

export const padLook = (p: Pad): Stick => deadzone({ x: p.axes[2] ?? 0, y: p.axes[3] ?? 0 })

export const padActive = (p: Pad): boolean =>
  p.buttons.some(Boolean) || Math.hypot(padMove(p).x, padMove(p).y) > 0 || Math.hypot(padLook(p).x, padLook(p).y) > 0

export const pressedNow = (prev: readonly boolean[], now: readonly boolean[], i: number): boolean => !!now[i] && !prev[i]

export const runLatch = (latched: boolean, toggled: boolean, push: number): boolean =>
  toggled ? !latched : latched && push > 0

export const MOUSE_RATE = 0.0032
export const STICK_RATE = 2.6
export const KEY_RATE = 1.8
export const TOUCH_RATE = 0.006

export const look = (dx: number, dy: number, c: Controls, rate: number): Readonly<{ yaw: number; pitch: number }> => ({
  yaw: -dx * rate * c.sensitivity,
  pitch: (c.invertY ? dy : -dy) * rate * c.sensitivity,
})

export const TOUCH_RADIUS = 60

export const touchStick = (origin: Stick, at: Stick, radius = TOUCH_RADIUS): Stick => {
  const s = { x: (at.x - origin.x) / radius, y: -(at.y - origin.y) / radius }
  return deadzone(unit(s), 0.12)
}

const named: Readonly<Record<string, string>> = {
  Space: 'Space',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Bksp',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  AltLeft: 'Alt',
  AltRight: 'Alt',
}

export const keyLabel = (code: string): string =>
  named[code] ?? (/^Key[A-Z]$/.test(code) ? code.slice(3) : /^Digit\d$/.test(code) ? code.slice(5) : code.replace(/^Numpad/, 'Num '))

export const padGlyphs: Readonly<Record<'xbox' | 'playstation', Readonly<{ confirm: string; run: string }>>> = {
  xbox: { confirm: 'A', run: 'LS' },
  playstation: { confirm: '✕', run: 'L3' },
}

export const glyph = (device: Device, c: Controls): string | undefined =>
  device === 'touch' ? undefined : device === 'keyboard' ? keyLabel(c.bindings.interact[0]) : padGlyphs[device].confirm

const keys = (c: Controls, a: Action): string => keyLabel(c.bindings[a][0])

export const help = (device: Device, c: Controls): string => {
  if (device === 'touch') return 'Drag on the left to walk, drag on the right to look, tap the ground to walk there. Press and hold a prompt to hold.'
  if (device !== 'keyboard') {
    const g = padGlyphs[device]
    return `Left stick to walk, press it (${g.run}) to run. Right stick to look. ${g.confirm} to interact; hold it when the prompt says so.`
  }
  const move = (['forward', 'left', 'back', 'right'] as const).map((a) => keys(c, a)).join('')
  const turn = (['lookUp', 'lookLeft', 'lookDown', 'lookRight'] as const).map((a) => keys(c, a)).join('')
  return `${move} to walk, ${keys(c, 'run')} to run. ${turn} or click and move the mouse to look, Esc to let go. ${keys(c, 'interact')} to interact; hold it when the prompt says so. Number keys pick an option.`
}

export type Store = Readonly<{ read: (key: string) => string | null; write: (key: string, value: string) => boolean }>

export const safeStore = (storage: () => Pick<Storage, 'getItem' | 'setItem'>): Store => ({
  read: (key) => {
    try {
      return storage().getItem(key)
    } catch {
      return null
    }
  },
  write: (key, value) => {
    try {
      storage().setItem(key, value)
      return true
    } catch {
      return false
    }
  },
})

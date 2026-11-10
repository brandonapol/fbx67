import type { Bindings, Device, Pad } from './input.ts'
import { held, keyLabel, keyStick, padMove, pressedNow } from './input.ts'
import type { Intent } from './combat.ts'
import { vec } from './world.ts'

// The fight's controls on keyboard and gamepad. Walking and running are the game's own bindings (input.ts); grab is
// the interact key, as everywhere else. Shove and use are the fight's. The camera looks north, so the stick's up is
// world -z.

export type Verb = 'shove' | 'grab' | 'use'

export const FIGHT_KEYS: Readonly<Record<Verb | 'restart', readonly string[]>> = {
  shove: ['KeyF'],
  grab: [],
  use: ['KeyR'],
  restart: ['Backspace'],
}

export const FIGHT_PAD = { grab: 0, use: 1, shove: 2, run: 5, restart: 9 } as const

const keyed = (b: Bindings, v: Verb): readonly string[] => (v === 'grab' ? b.interact : FIGHT_KEYS[v])

const pressedKey = (b: Bindings, pressed: ReadonlySet<string>, v: Verb): boolean => keyed(b, v).some((k) => pressed.has(k))

// This frame's intent: `keys` are held, `pressed` went down since the last frame; `prev` is the pad's last buttons.
export const intent = (
  b: Bindings,
  keys: ReadonlySet<string>,
  pressed: ReadonlySet<string>,
  pad: Pad | undefined,
  prev: readonly boolean[],
): Intent => {
  const k = keyStick(keys, b)
  const p = pad ? padMove(pad) : { x: 0, y: 0 }
  const s = Math.hypot(p.x, p.y) > Math.hypot(k.x, k.y) ? p : k
  const now = pad?.buttons ?? []
  const verb = (v: Verb): boolean => pressedKey(b, pressed, v) || pressedNow(prev, now, FIGHT_PAD[v])
  return {
    move: vec(s.x, -s.y),
    run: held(keys, b, 'run') || !!now[FIGHT_PAD.run],
    shove: verb('shove'),
    grab: verb('grab'),
    use: verb('use'),
  }
}

export const restart = (pressed: ReadonlySet<string>, pad: Pad | undefined, prev: readonly boolean[]): boolean =>
  FIGHT_KEYS.restart.some((k) => pressed.has(k)) || (!!pad && pressedNow(prev, pad.buttons, FIGHT_PAD.restart))

const padNames: Readonly<Record<'xbox' | 'playstation', Readonly<Record<Verb | 'run' | 'restart', string>>>> = {
  xbox: { grab: 'A', use: 'B', shove: 'X', run: 'RB', restart: 'Menu' },
  playstation: { grab: '✕', use: '○', shove: '□', run: 'R1', restart: 'Options' },
}

export const fightHelp = (device: Device, b: Bindings): string => {
  const n =
    device === 'xbox' || device === 'playstation'
      ? { ...padNames[device], move: 'Left stick' }
      : { shove: keyLabel(FIGHT_KEYS.shove[0]), grab: keyLabel(b.interact[0]), use: keyLabel(FIGHT_KEYS.use[0]), run: keyLabel(b.run[0]), restart: keyLabel(FIGHT_KEYS.restart[0]), move: 'WASD' }
  return `${n.move} to move, hold ${n.run} to run. ${n.shove} shove, ${n.grab} grab or drop, ${n.use} break a bottle on the bar. Knocked down, any of them gets you up. ${n.restart} restarts.`
}
